import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';
import { Submission } from '../models/Submission.js';
import { Card } from '../models/Card.js';
import { Mission } from '../models/Mission.js';
import {
  buildTurnTransition,
  buildApprovedScore,
  canSubmitForTurn,
  calculateGroupScore,
  calculateApprovalThreshold,
  getTurnDeadline,
  getTurnPosition,
  getVotingDecision,
  isGroupRatingApproval,
  isValidGroupScore,
  shouldExpireTurn,
  isValidRoundLimit,
  isValidTurnDuration,
} from '../utils/gameRules.js';
import { deleteEvidence, readEvidenceDataUrl, storeEvidence } from '../utils/evidenceStore.js';
import { createPlayerToken, hashPlayerToken, verifyPlayerToken } from '../utils/playerAuth.js';
import { isDBConnected, connectDB } from '../config/db.js';

const validDeviceModes = ['single_device', 'multi_device'];
const validVerificationMethods = ['ai', 'group'];
const validGameModes = ['casual', 'speedrun', 'spicy'];
const turnState = (room) => {
  const turnIndex = Number.isInteger(room.currentTurnIndex) ? room.currentTurnIndex : 0;
  const playerCount = room.players.length;
  const { playerIndex } = getTurnPosition(turnIndex, playerCount || 1);
  return {
    turnIndex,
    activePlayerId: room.activePlayerId || room.players[playerIndex]?.id || null,
  };
};

export const advanceTurn = async (room, status, score = 0, session, expectedSubmissionId = null) => {
  const { turnIndex, activePlayerId } = turnState(room);
  const playerCount = room.players.length;
  const roundLimit = room.totalRounds === 24 ? 5 : room.totalRounds;
  const now = new Date();
  const duration = isValidTurnDuration(room.turnDurationSeconds) ? room.turnDurationSeconds : 30;
  const transition = buildTurnTransition({
    turnIndex,
    playerCount: playerCount || 1,
    roundLimit,
    turnDurationSeconds: duration,
    status,
    score,
    resolvedAt: now,
  });
  const nextPlayer = transition.nextPlayerIndex === null
    ? null
    : room.players[transition.nextPlayerIndex]?.id ?? null;
  const update = {
    $set: {
      status: transition.gameStatus,
      currentRound: transition.nextRound,
      currentTurnIndex: transition.nextTurnIndex,
      activePlayerId: nextPlayer,
      activeSubmissionId: null,
      turnStartedAt: transition.turnStartedAt,
      turnDeadline: transition.turnDeadline,
      turnRemainingSeconds: null,
    },
    $push: {
      turnHistory: {
        ...transition.turnRecord,
        playerId: activePlayerId,
      },
    },
  };
  const filter = { _id: room._id, status: 'active', currentTurnIndex: turnIndex };
  if (activePlayerId) filter.activePlayerId = activePlayerId;
  if (expectedSubmissionId) filter.activeSubmissionId = expectedSubmissionId;
  else filter.activeSubmissionId = null;
  return Room.findOneAndUpdate(filter, update, { new: true, session });
};

const resolveExpiredTurn = async (roomCode) => {
  const room = await Room.findOne({
    roomCode,
    status: 'active',
    turnDeadline: { $lte: new Date() },
  });
  if (!room) return;
  const { turnIndex, activePlayerId } = turnState(room);
  if (!activePlayerId) return;
  const hasPendingSubmission = await Submission.exists({
    roomCode,
    turnIndex,
    playerId: activePlayerId,
    status: 'pending',
  });
  if (shouldExpireTurn(new Date(), room.turnDeadline, Boolean(hasPendingSubmission)) === false) return;

  const playerCount = room.players.length;
  const roundLimit = room.totalRounds === 24 ? 5 : room.totalRounds;
  const now = new Date();
  const duration = isValidTurnDuration(room.turnDurationSeconds) ? room.turnDurationSeconds : 30;
  const transition = buildTurnTransition({
    turnIndex,
    playerCount: playerCount || 1,
    roundLimit,
    turnDurationSeconds: duration,
    status: 'timed_out',
    resolvedAt: now,
  });
  const nextPlayer = transition.nextPlayerIndex === null
    ? null
    : room.players[transition.nextPlayerIndex]?.id ?? null;
  await Room.updateOne(
    {
      _id: room._id,
      status: 'active',
      currentTurnIndex: turnIndex,
      activePlayerId,
      activeSubmissionId: null,
      turnDeadline: { $lte: now },
    },
    {
      $set: {
        status: transition.gameStatus,
        currentRound: transition.nextRound,
        currentTurnIndex: transition.nextTurnIndex,
        activePlayerId: nextPlayer,
        activeSubmissionId: null,
        turnStartedAt: transition.turnStartedAt,
        turnDeadline: transition.turnDeadline,
        turnRemainingSeconds: null,
      },
      $push: {
        turnHistory: {
          ...transition.turnRecord,
          playerId: activePlayerId,
        },
      },
    },
  );
};

const normalizeRoomCode = (value) => {
  const raw = String(value ?? '').trim();
  return raw ? raw.toUpperCase() : `ROOM-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
};

const sanitizeSubmission = (submission, viewerId = null) => {
  const data = submission.toObject ? submission.toObject() : submission;
  const yesVotes = data.votes.filter((vote) => vote.approve).length;
  const noVotes = data.votes.length - yesVotes;
  return {
    _id: data._id,
    roomCode: data.roomCode,
    round: data.round,
    turnIndex: Number.isInteger(data.turnIndex) ? data.turnIndex : Math.max(0, data.round - 1),
    playerId: data.playerId,
    cardCode: data.cardCode,
    cardTitle: data.cardTitle,
    mission: data.mission,
    hasEvidence: data.hasEvidence,
    eligibleVoterIds: data.eligibleVoterIds,
    eligibleVoterCount: data.eligibleVoterIds.length,
    requiredVotes: data.requiredVotes,
    voteCount: data.votes.length,
    hasVoted: viewerId ? data.votes.some((vote) => vote.playerId === viewerId) : false,
    groupScore: data.status === 'pending'
      ? undefined
      : data.groupScore ?? calculateGroupScore(data.votes),
    yesVotes: data.status === 'pending' ? undefined : yesVotes,
    noVotes: data.status === 'pending' ? undefined : noVotes,
    status: data.status,
    scoreBreakdown: data.scoreBreakdown,
    createdAt: data.createdAt,
    decisionAt: data.decisionAt,
  };
};

const getImageBuffer = (evidence) => {
  if (typeof evidence !== 'string') return null;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(evidence);
  if (!match) return null;

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 1024 * 1024) return null;
  const validJpeg = match[1] === 'jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const validPng = match[1] === 'png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const validWebp = match[1] === 'webp'
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
  return validJpeg || validPng || validWebp ? { buffer, contentType: `image/${match[1]}` } : null;
};

const requirePlayer = (room, playerId) => (
  typeof playerId === 'string' && playerId.trim()
    ? room.players.find((player) => player.id === playerId)
    : null
);

const authenticatePlayer = (room, playerId, token) => {
  const player = requirePlayer(room, playerId);
  return Boolean(player && verifyPlayerToken(token, player.authTokenHash));
};

const sanitizeRoom = (room) => {
  const data = room.toObject ? room.toObject() : room;
  const { activePlayerId } = turnState(data);
  return {
    ...data,
    totalRounds: data.totalRounds === 24 ? 5 : data.totalRounds ?? 5,
    turnDurationSeconds: isValidTurnDuration(data.turnDurationSeconds) ? data.turnDurationSeconds : 30,
    activePlayerId,
    serverNow: new Date().toISOString(),
    players: data.players.map(({ authTokenHash, ...player }) => player),
  };
};

const sendError = (res, error, defaultStatus = 500) => {
  res.status(error.status || defaultStatus).json({
    success: false,
    message: error.message || 'Máy chủ không thể xử lý yêu cầu.',
  });
};

export const getRoom = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    await resolveExpiredTurn(roomCode);
    const room = await Room.findOne({ roomCode }).populate('activeCard');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại!' });
    res.json({ success: true, data: sanitizeRoom(room) });
  } catch (error) {
    sendError(res, error);
  }
};

export const createRoom = async (req, res) => {
  try {
    if (!isDBConnected()) {
      await connectDB();
      if (!isDBConnected()) {
        return res.status(503).json({
          success: false,
          message: 'Cơ sở dữ liệu MongoDB chưa kết nối. Vui lòng đảm bảo dịch vụ MongoDB (mongod) đang chạy!',
        });
      }
    }
    const {
      roomCode, theme, mode, hostName, deviceMode, verificationMethod,
      photoBonusEnabled, turnDurationSeconds, totalRounds,
    } = req.body;
    if (turnDurationSeconds !== undefined && !isValidTurnDuration(turnDurationSeconds)) {
      return res.status(400).json({ success: false, message: 'Thời lượng lượt không hợp lệ.' });
    }
    if (totalRounds !== undefined && !isValidRoundLimit(totalRounds)) {
      return res.status(400).json({ success: false, message: 'Số vòng chơi không hợp lệ.' });
    }
    const code = normalizeRoomCode(roomCode);
    const chosenDeviceMode = validDeviceModes.includes(deviceMode) ? deviceMode : 'multi_device';
    // Chế độ Multi-device bắt buộc chấm bằng AI
    const chosenVerificationMethod = chosenDeviceMode === 'multi_device'
      ? 'ai'
      : (validVerificationMethods.includes(verificationMethod) ? verificationMethod : 'group');
    const chosenMode = validGameModes.includes(mode) ? mode : 'spicy';

    const hostPlayerId = randomUUID();
    const playerToken = createPlayerToken();
    const newRoom = await Room.create({
      roomCode: code,
      theme: typeof theme === 'string' ? theme.slice(0, 40) : 'pose',
      mode: chosenMode,
      deviceMode: chosenDeviceMode,
      verificationMethod: chosenVerificationMethod,
      photoBonusEnabled: typeof photoBonusEnabled === 'boolean' ? photoBonusEnabled : true,
      turnDurationSeconds: turnDurationSeconds ?? 30,
      totalRounds: totalRounds ?? 5,
      hostName: typeof hostName === 'string' && hostName.trim() ? hostName.trim().slice(0, 40) : 'Host',
      hostPlayerId,
      players: [{
        id: hostPlayerId,
        authTokenHash: hashPlayerToken(playerToken),
        name: typeof hostName === 'string' && hostName.trim() ? hostName.trim().slice(0, 40) : 'Host',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(hostName || 'Host')}`,
        score: 0,
        approvedChallenges: 0,
        streak: 0,
        badges: ['👑 Host'],
      }],
    });

    res.status(201).json({ success: true, data: sanitizeRoom(newRoom), playerToken });
  } catch (error) {
    sendError(res, error);
  }
};

export const joinRoom = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const room = await Room.findOne({ roomCode });
    if (!room) return res.status(404).json({ success: false, message: 'Phòng không tồn tại!' });
    if (room.status !== 'waiting') {
      return res.status(409).json({ success: false, message: 'Phòng đã bắt đầu và không nhận thêm người chơi.' });
    }

    const candidateName = String(req.body.playerName || `Player ${room.players.length + 1}`).trim();
    if (!candidateName || candidateName.length > 40) {
      return res.status(400).json({ success: false, message: 'Tên người chơi phải có từ 1 đến 40 ký tự.' });
    }
    const playerToken = createPlayerToken();
    const player = {
      id: randomUUID(),
      authTokenHash: hashPlayerToken(playerToken),
      name: candidateName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(candidateName)}`,
      score: 0,
      approvedChallenges: 0,
      streak: 0,
      badges: ['⚡ Newbie'],
    };
    const escapedName = candidateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = await Room.updateOne(
      {
        _id: room._id,
        status: 'waiting',
        players: { $not: { $elemMatch: { name: new RegExp(`^${escapedName}$`, 'i') } } },
      },
      { $push: { players: player } }
    );
    if (result.matchedCount !== 1) {
      const latest = await Room.findById(room._id);
      if (latest?.status !== 'waiting') {
        return res.status(409).json({ success: false, message: 'Phòng đã bắt đầu và không nhận thêm người chơi.' });
      }
      return res.status(409).json({ success: false, message: 'Tên người chơi đã tồn tại trong phòng này.' });
    }

    const updatedRoom = await Room.findById(room._id);
    res.json({ success: true, data: sanitizeRoom(updatedRoom), player: { id: player.id }, playerToken });
  } catch (error) {
    sendError(res, error, 400);
  }
};

export const startRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: normalizeRoomCode(req.params.roomCode) })
      .select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    const hostPlayerId = room.hostPlayerId || room.players[0]?.id;
    if (!hostPlayerId || req.body.playerId !== hostPlayerId || !authenticatePlayer(room, req.body.playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Chỉ người tạo phòng mới có thể bắt đầu ván chơi.' });
    }
    if (room.status === 'completed') {
      return res.status(409).json({ success: false, message: 'Ván chơi này đã kết thúc.' });
    }
    if (room.status !== 'waiting') {
      return res.status(409).json({ success: false, message: 'Ván chơi đã bắt đầu.' });
    }
    const {
      theme, mode, verificationMethod, photoBonusEnabled,
      turnDurationSeconds, totalRounds,
    } = req.body;
    // Chế độ Multi-device bắt buộc chấm bằng AI
    const selectedVerification = room.deviceMode === 'multi_device'
      ? 'ai'
      : (verificationMethod ?? room.verificationMethod);
    if (!validVerificationMethods.includes(selectedVerification)) {
      return res.status(400).json({ success: false, message: 'Phương thức xác thực không hợp lệ.' });
    }
    if (room.deviceMode === 'multi_device' && room.players.length < 2) {
      return res.status(409).json({ success: false, message: 'Cần ít nhất 2 người chơi trong chế độ nhiều thiết bị. Hãy đợi người chơi khác tham gia trước khi bắt đầu.' });
    }
    if (theme !== undefined && (typeof theme !== 'string' || theme.length > 40)) {
      return res.status(400).json({ success: false, message: 'Chủ đề không hợp lệ.' });
    }
    if (mode !== undefined && !validGameModes.includes(mode)) {
      return res.status(400).json({ success: false, message: 'Chế độ chơi không hợp lệ.' });
    }
    if (photoBonusEnabled !== undefined && typeof photoBonusEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Cấu hình thưởng ảnh không hợp lệ.' });
    }
    if (turnDurationSeconds !== undefined && !isValidTurnDuration(turnDurationSeconds)) {
      return res.status(400).json({ success: false, message: 'Thời lượng lượt không hợp lệ.' });
    }
    if (totalRounds !== undefined && !isValidRoundLimit(totalRounds)) {
      return res.status(400).json({ success: false, message: 'Số vòng chơi không hợp lệ.' });
    }

    room.hostPlayerId = hostPlayerId;
    if (theme !== undefined) room.theme = theme;
    if (mode !== undefined) room.mode = mode;
    room.verificationMethod = selectedVerification;
    if (photoBonusEnabled !== undefined) room.photoBonusEnabled = photoBonusEnabled;
    room.turnDurationSeconds = turnDurationSeconds ?? room.turnDurationSeconds ?? 30;
    room.totalRounds = totalRounds ?? (room.totalRounds === 24 ? 5 : room.totalRounds ?? 5);
    room.status = 'active';
    room.currentRound = 1;
    room.currentTurnIndex = 0;
    room.activePlayerId = room.players[0]?.id ?? null;
    room.activeSubmissionId = null;
    room.turnStartedAt = null;
    room.turnDeadline = null;
    room.turnRemainingSeconds = null;
    room.turnHistory = [];
    await room.save();
    res.json({ success: true, data: sanitizeRoom(room) });
  } catch (error) {
    sendError(res, error);
  }
};


export const startRoomTurn = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { playerId, turnIndex: requestedTurnIndex } = req.body;
    if (typeof playerId !== 'string' || !playerId.trim()) {
      return res.status(400).json({ success: false, message: 'Người chơi không hợp lệ.' });
    }
    if (!Number.isInteger(requestedTurnIndex) || requestedTurnIndex < 0) {
      return res.status(400).json({ success: false, message: 'Lượt cần bắt đầu không hợp lệ.' });
    }

    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    if (!authenticatePlayer(room, playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    if (room.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Phòng chơi chưa bắt đầu hoặc đã kết thúc.' });
    }

    const current = turnState(room);
    if (requestedTurnIndex !== current.turnIndex) {
      return res.status(409).json({
        success: false,
        message: 'Lượt chơi đã thay đổi. Hãy đồng bộ phòng trước khi mở camera.',
        data: sanitizeRoom(room),
      });
    }
    if (current.activePlayerId !== playerId) {
      return res.status(403).json({ success: false, message: 'Chỉ người đang có lượt mới được bắt đầu đồng hồ.' });
    }

    // Retries are safe: opening/reopening the camera must never reset an already-started turn.
    if (room.turnStartedAt) return res.json({ success: true, data: sanitizeRoom(room) });

    if (room.activeSubmissionId || await Submission.exists({
      roomCode,
      turnIndex: current.turnIndex,
      playerId,
      status: 'pending',
    })) {
      return res.status(409).json({ success: false, message: 'Lượt này đã có thử thách đang chờ xác thực.' });
    }

    const startedAt = new Date();
    const configuredDuration = isValidTurnDuration(room.turnDurationSeconds) ? room.turnDurationSeconds : 30;
    const duration = typeof room.turnRemainingSeconds === 'number'
      ? room.turnRemainingSeconds
      : configuredDuration;
    if (configuredDuration > 0 && duration <= 0) {
      await resolveExpiredTurn(roomCode);
      const latest = await Room.findOne({ roomCode });
      return res.status(409).json({
        success: false,
        message: 'Thời gian lượt đã hết. Lượt đã được chuyển tiếp.',
        data: latest ? sanitizeRoom(latest) : undefined,
      });
    }
    const turnDeadline = getTurnDeadline(startedAt, duration);
    const updated = await Room.findOneAndUpdate(
      {
        _id: room._id,
        status: 'active',
        currentTurnIndex: requestedTurnIndex,
        activePlayerId: playerId,
        turnStartedAt: null,
      },
      { $set: { turnStartedAt: startedAt, turnDeadline, turnRemainingSeconds: null } },
      { new: true },
    );
    if (updated) return res.json({ success: true, data: sanitizeRoom(updated) });

    // Another retry may have armed the same turn between read and update; return it without resetting time.
    const latest = await Room.findOne({ roomCode });
    if (latest?.status === 'active'
      && latest.currentTurnIndex === requestedTurnIndex
      && latest.activePlayerId === playerId
      && latest.turnStartedAt) {
      return res.json({ success: true, data: sanitizeRoom(latest) });
    }
    return res.status(409).json({
      success: false,
      message: 'Lượt đã được cập nhật đồng thời. Hãy đồng bộ phòng và thử lại.',
      data: latest ? sanitizeRoom(latest) : undefined,
    });
  } catch (error) {
    sendError(res, error);
  }
};


export const pauseRoomTurn = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { playerId, playerToken } = req.body;
    const requestedTurnIndex = Number(req.body.turnIndex);
    if (typeof playerId !== 'string' || !playerId.trim()) {
      return res.status(400).json({ success: false, message: 'Người chơi không hợp lệ.' });
    }
    if (!Number.isInteger(requestedTurnIndex) || requestedTurnIndex < 0) {
      return res.status(400).json({ success: false, message: 'Lượt cần tạm dừng không hợp lệ.' });
    }

    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    const token = req.get('x-player-token') || playerToken;
    if (!authenticatePlayer(room, playerId, token)) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    const current = turnState(room);
    if (room.status !== 'active' || requestedTurnIndex !== current.turnIndex || current.activePlayerId !== playerId) {
      return res.status(409).json({ success: false, message: 'Lượt chơi đã thay đổi; đồng bộ phòng trước khi tạm dừng.' });
    }

    // Once a submission exists, the timed action is over; validation must not keep or pause the camera timer.
    if (room.activeSubmissionId || await Submission.exists({
      roomCode, turnIndex: requestedTurnIndex, playerId, status: 'pending',
    })) {
      return res.json({ success: true, data: sanitizeRoom(room) });
    }

    // With a disabled timer, there is no countdown to pause. Keep turnStartedAt so submissions remain valid.
    if (!room.turnDeadline || !room.turnStartedAt) {
      return res.json({ success: true, data: sanitizeRoom(room) });
    }

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.ceil((room.turnDeadline.getTime() - now.getTime()) / 1000));
    if (remainingSeconds === 0) {
      await resolveExpiredTurn(roomCode);
      const latest = await Room.findOne({ roomCode });
      return res.status(409).json({
        success: false,
        message: 'Thời gian lượt đã hết. Lượt đã được chuyển tiếp.',
        data: latest ? sanitizeRoom(latest) : undefined,
      });
    }

    const paused = await Room.findOneAndUpdate(
      {
        _id: room._id,
        status: 'active',
        currentTurnIndex: requestedTurnIndex,
        activePlayerId: playerId,
        turnStartedAt: room.turnStartedAt,
        turnDeadline: room.turnDeadline,
      },
      { $set: { turnStartedAt: null, turnDeadline: null, turnRemainingSeconds: remainingSeconds } },
      { new: true },
    );
    if (paused) return res.json({ success: true, data: sanitizeRoom(paused) });

    const latest = await Room.findOne({ roomCode });
    if (latest?.status === 'active'
      && latest.currentTurnIndex === requestedTurnIndex
      && latest.activePlayerId === playerId
      && !latest.turnDeadline) {
      return res.json({ success: true, data: sanitizeRoom(latest) });
    }
    return res.status(409).json({
      success: false,
      message: 'Lượt đã thay đổi đồng thời. Hãy đồng bộ phòng.',
      data: latest ? sanitizeRoom(latest) : undefined,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createSubmission = async (req, res) => {
  let storedEvidenceId = null;
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    if (room.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Phòng chơi chưa bắt đầu hoặc đã kết thúc.' });
    }
    if (room.verificationMethod !== 'group' && room.verificationMethod !== 'ai') {
      return res.status(409).json({ success: false, message: 'Phương thức xác thực không hợp lệ.' });
    }

    const { playerId, round, missionCode, cardCode, evidence } = req.body;
    if (!authenticatePlayer(room, playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    if (!Number.isInteger(round) || round !== room.currentRound) {
      return res.status(409).json({ success: false, message: 'Lượt chơi đã thay đổi. Hãy đồng bộ lại phòng.' });
    }
    const { turnIndex, activePlayerId } = turnState(room);
    const expectedPlayer = room.players.find((player) => player.id === activePlayerId);
    if (!room.turnStartedAt && !(typeof room.turnRemainingSeconds === 'number' && room.turnRemainingSeconds > 0)) {
      return res.status(409).json({ success: false, message: 'Hãy mở camera đến khi có hình ảnh trực tiếp trước khi gửi thử thách.' });
    }
    if (activePlayerId !== playerId) {
      return res.status(403).json({ success: false, message: `Lượt này thuộc về ${expectedPlayer?.name ?? 'người chơi khác'}.` });
    }
    const hasCurrentSubmission = Boolean(room.activeSubmissionId || await Submission.exists({
      roomCode,
      turnIndex,
      status: 'pending',
    }));
    if (!canSubmitForTurn({
      playerId,
      activePlayerId,
      turnIndex,
      activeTurnIndex: turnIndex,
      now: new Date(),
      deadline: room.turnDeadline,
      hasActiveSubmission: hasCurrentSubmission,
    })) {
      if (room.turnDeadline && room.turnDeadline.getTime() <= Date.now()) {
        await resolveExpiredTurn(roomCode);
        return res.status(409).json({ success: false, message: 'Thời gian lượt đã hết. Lượt đã được chuyển tiếp.' });
      }
      return res.status(409).json({ success: false, message: 'Thử thách của lượt này đã được gửi và đang chờ xác thực.' });
    }
    if (
      typeof cardCode !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(cardCode)
      || typeof missionCode !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(missionCode)
    ) {
      return res.status(400).json({ success: false, message: 'Thông tin thử thách không hợp lệ.' });
    }
    const normalizedCardCode = cardCode.toUpperCase();
    const alternateCardCode = normalizedCardCode.startsWith('PC-')
      ? normalizedCardCode.replace(/^PC-/, 'SD-')
      : normalizedCardCode.replace(/^SD-/, 'PC-');
    const [card, selectedMission] = await Promise.all([
      Card.findOne({
        $or: [
          { code: normalizedCardCode },
          { code: alternateCardCode },
          { qrKey: normalizedCardCode },
          { qrKey: alternateCardCode },
        ],
        isActive: true,
      }),
      Mission.findOne({ missionCode, isActive: true }),
    ]);
    const missionCardCode = selectedMission?.cardCode?.toUpperCase();
    if (
      !card
      || !selectedMission
      || ![normalizedCardCode, alternateCardCode].includes(missionCardCode)
      || ![card.code.toUpperCase(), card.qrKey.toUpperCase()].includes(missionCardCode)
    ) {
      return res.status(400).json({ success: false, message: 'Thử thách không khớp với thẻ đã đăng ký trên máy chủ.' });
    }
    if (room.usedCardCodes.includes(cardCode)) {
      return res.status(409).json({ success: false, message: 'Thẻ này đã được chơi trong ván hiện tại. Hãy chọn một thẻ khác.' });
    }

    const parsedEvidence = evidence == null ? null : getImageBuffer(evidence);
    if (evidence != null && !parsedEvidence) {
      return res.status(400).json({ success: false, message: 'Ảnh phải là JPEG, PNG hoặc WebP hợp lệ và không lớn hơn 1 MiB.' });
    }
    if (room.verificationMethod === 'ai' && !parsedEvidence) {
      return res.status(400).json({ success: false, message: 'Xác thực AI yêu cầu ảnh bằng chứng. Hãy chụp ảnh trước khi gửi thử thách.' });
    }

    const isAi = room.verificationMethod === 'ai';
    const eligibleVoterIds = isAi
      ? ['ai-judge']
      : room.players.map((player) => player.id).filter((id) => id !== playerId);
    if (!isAi && !eligibleVoterIds.length) {
      return res.status(409).json({
        success: false,
        message: 'Xác thực nhóm cần người đánh giá khác. Thêm người chơi; không thể tự duyệt thử thách.',
      });
    }
    if (parsedEvidence) {
      storedEvidenceId = await storeEvidence(parsedEvidence.buffer, parsedEvidence.contentType, {
        roomCode,
        playerId,
      });
    }

    const session = await mongoose.startSession();
    let created;
    const submissionId = new mongoose.Types.ObjectId();
    try {
      await session.withTransaction(async () => {
        const reservedCard = await Room.updateOne(
          {
            _id: room._id,
            status: 'active',
            currentRound: round,
            currentTurnIndex: turnIndex,
            activePlayerId,
            activeSubmissionId: null,
            ...(room.turnDeadline ? { turnDeadline: { $gt: new Date() } } : {}),
            usedCardCodes: { $ne: cardCode },
          },
          {
            $addToSet: { usedCardCodes: cardCode },
            $set: {
              activeSubmissionId: submissionId,
              turnStartedAt: null,
              turnDeadline: null,
              turnRemainingSeconds: null,
            },
          },
          { session }
        );
        if (reservedCard.matchedCount !== 1) {
          const error = new Error('Lượt chơi hoặc thẻ đã được thay đổi. Đồng bộ lại trước khi gửi.');
          error.status = 409;
          throw error;
        }
        [created] = await Submission.create([{
          _id: submissionId,
          roomCode,
          round,
          turnIndex,
          playerId,
          missionCode,
          cardCode,
          cardTitle: card.title,
          mission: selectedMission.instruction,
          evidenceFileId: storedEvidenceId,
          hasEvidence: Boolean(storedEvidenceId),
          eligibleVoterIds,
          requiredVotes: isAi ? 1 : calculateApprovalThreshold(eligibleVoterIds.length),
        }], { session });
      });
    } finally {
      await session.endSession();
    }
    res.status(201).json({ success: true, data: sanitizeSubmission(created, playerId) });
  } catch (error) {
    if (storedEvidenceId) {
      try {
        await deleteEvidence(storedEvidenceId);
      } catch (cleanupError) {
        console.error('[Submission] Failed to clean up unlinked evidence:', cleanupError);
      }
    }
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Đã có lượt gửi hoặc thẻ này đã được dùng. Không thể gửi trùng.' });
    }
    sendError(res, error);
  }
};

export const getRoomSubmissions = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    if (!authenticatePlayer(room, req.query.playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    const filter = { roomCode };
    if (req.query.round !== undefined) {
      const round = Number(req.query.round);
      if (!Number.isInteger(round) || round < 1) {
        return res.status(400).json({ success: false, message: 'Số vòng không hợp lệ.' });
      }
      filter.round = round;
    }
    const submissions = await Submission.find(filter).select('+evidenceFileId').sort({ createdAt: -1 }).lean();
    const data = await Promise.all(submissions.map(async (submission) => ({
      ...sanitizeSubmission(submission, req.query.playerId),
      evidence: submission.evidenceFileId
        ? await readEvidenceDataUrl(submission.evidenceFileId, roomCode)
        : null,
    })));
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};

export const voteOnSubmission = async (req, res) => {
  const { playerId, score, approve: legacyApproval } = req.body;
  if (
    typeof playerId !== 'string'
    || !(isValidGroupScore(score) || (score === undefined && typeof legacyApproval === 'boolean'))
  ) {
    return res.status(400).json({ success: false, message: 'Cần có mã người chơi và điểm từ 0 đến 100.' });
  }
  const groupScoreVote = isValidGroupScore(score) ? score : legacyApproval ? 100 : 0;
  const approve = isGroupRatingApproval(groupScoreVote);

  const session = await mongoose.startSession();
  let responseData;
  let responseStatus = 200;
  try {
    await session.withTransaction(async () => {
      const submission = await Submission.findById(req.params.submissionId).session(session);
      if (!submission) {
        const error = new Error('Không tìm thấy lượt gửi thử thách.');
        error.status = 404;
        throw error;
      }
      if (submission.status !== 'pending') {
        responseData = sanitizeSubmission(submission, playerId);
        responseStatus = 409;
        return;
      }
      const room = await Room.findOne({ roomCode: submission.roomCode })
        .select('+players.authTokenHash')
        .session(session);
      if (!room || !authenticatePlayer(room, playerId, req.get('x-player-token'))) {
        const error = new Error('Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.');
        error.status = 403;
        throw error;
      }
      const activeEligibleVoterIds = submission.eligibleVoterIds.filter((eligibleId) => (
        room.players.some((player) => player.id === eligibleId)
      ));
      if (!activeEligibleVoterIds.length) {
        const activeTurn = turnState(room);
        if (
          room.status !== 'active'
          || activeTurn.turnIndex !== submission.turnIndex
          || room.activeSubmissionId?.toString() !== submission._id.toString()
        ) {
          const error = new Error('Lượt gửi không còn là lượt hiện tại của phòng.');
          error.status = 409;
          throw error;
        }
        const rejected = await Submission.findOneAndUpdate(
          { _id: submission._id, status: 'pending' },
          { $set: { status: 'rejected', decisionAt: new Date() } },
          { new: true, session }
        );
        const moved = rejected && await advanceTurn(room, 'failed', 0, session, rejected._id);
        if (!moved) {
          const error = new Error('Không còn người đánh giá hợp lệ; không thể hoàn tất lượt này.');
          error.status = 409;
          throw error;
        }
        responseData = sanitizeSubmission(rejected, playerId);
        return;
      }
      if (playerId === submission.playerId) {
        const error = new Error('Người gửi thử thách không được tự bỏ phiếu.');
        error.status = 403;
        throw error;
      }
      if (!activeEligibleVoterIds.includes(playerId)) {
        const error = new Error('Người chơi không đủ điều kiện đánh giá lượt gửi này.');
        error.status = 403;
        throw error;
      }
      const expectedTurnIndex = Number.isInteger(submission.turnIndex)
        ? submission.turnIndex
        : turnState(room).turnIndex;
      const activeTurn = turnState(room);
      if (
        room.status !== 'active'
        || activeTurn.turnIndex !== expectedTurnIndex
        || activeTurn.activePlayerId !== submission.playerId
      ) {
        const error = new Error('Lượt gửi không còn là lượt hiện tại của phòng.');
        error.status = 409;
        throw error;
      }

      const votedSubmission = await Submission.findOneAndUpdate(
        {
          _id: submission._id,
          status: 'pending',
          eligibleVoterIds: playerId,
          votes: { $not: { $elemMatch: { playerId } } },
        },
        {
          $set: {
            eligibleVoterIds: activeEligibleVoterIds,
            requiredVotes: calculateApprovalThreshold(activeEligibleVoterIds.length),
          },
          $push: { votes: { playerId, score: groupScoreVote, approve } },
        },
        { new: true, session }
      );
      if (!votedSubmission) {
        const latest = await Submission.findById(submission._id).session(session);
        if (latest?.status !== 'pending') {
          responseData = sanitizeSubmission(latest, playerId);
          responseStatus = 409;
          return;
        }
        const error = new Error('Bạn đã bỏ phiếu cho lượt gửi này rồi.');
        error.status = 409;
        throw error;
      }

      const yesVotes = votedSubmission.votes.filter((vote) => vote.approve).length;
      const decision = getVotingDecision({
        yesVotes,
        votesCast: votedSubmission.votes.length,
        eligibleVoterCount: activeEligibleVoterIds.length,
      });
      const update = {};
      update.groupScore = calculateGroupScore(votedSubmission.votes);
      if (decision === 'approved') {
        const scoreBreakdown = buildApprovedScore({
          photoBonusEnabled: room.photoBonusEnabled,
          hasEvidence: votedSubmission.hasEvidence,
        });
        update.status = 'approved';
        update.decisionAt = new Date();
        update.scoreBreakdown = scoreBreakdown;
        const updatedRoom = await Room.updateOne(
          { _id: room._id, 'players.id': votedSubmission.playerId },
          {
            $inc: {
              'players.$.score': scoreBreakdown.total,
              'players.$.approvedChallenges': 1,
            },
          },
          { session }
        );
        if (updatedRoom.matchedCount !== 1) {
          const error = new Error('Không thể cập nhật điểm người chơi trong phòng.');
          error.status = 409;
          throw error;
        }
      } else if (decision === 'rejected') {
        update.status = 'rejected';
        update.decisionAt = new Date();
      }
      await Submission.updateOne(
        { _id: votedSubmission._id, status: 'pending' },
        { $set: update },
        { session }
      );
      if (decision !== 'pending') {
        const resolved = await Submission.findById(votedSubmission._id).session(session);
        const resolvedTurnIndex = Number.isInteger(resolved.turnIndex)
          ? resolved.turnIndex
          : turnState(room).turnIndex;
        if (resolvedTurnIndex !== turnState(room).turnIndex) {
          const error = new Error('Lượt đã được cập nhật đồng thời. Hãy đồng bộ trạng thái phòng.');
          error.status = 409;
          throw error;
        }
        const moved = await advanceTurn(
          room,
          decision === 'approved' ? 'completed' : 'failed',
          decision === 'approved' ? resolved.scoreBreakdown.total : 0,
          session,
          resolved._id,
        );
        if (!moved) {
          const error = new Error('Lượt đã được cập nhật đồng thời. Hãy đồng bộ trạng thái phòng.');
          error.status = 409;
          throw error;
        }
      }
      const finalSubmission = await Submission.findById(votedSubmission._id).session(session);
      responseData = sanitizeSubmission(finalSubmission, playerId);
    });
    res.status(responseStatus).json({ success: responseStatus === 200, data: responseData });
  } catch (error) {
    sendError(res, error);
  } finally {
    await session.endSession();
  }
};

export const getRoomGallery = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    if (!authenticatePlayer(room, req.query.playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    const finished = await Submission.find({ roomCode, status: { $in: ['approved', 'rejected'] }, hasEvidence: true })
      .select('+evidenceFileId')
      .sort({ decisionAt: -1 })
      .lean();
    const dataWithImages = await Promise.all(finished.map(async (submission) => ({
      id: String(submission._id),
      round: submission.round,
      image: await readEvidenceDataUrl(submission.evidenceFileId, roomCode),
      cardTitle: submission.cardTitle,
      score: submission.scoreBreakdown.total,
      mission: submission.mission,
      passed: submission.status === 'approved',
      playerName: room.players.find((player) => player.id === submission.playerId)?.name ?? 'Người chơi',
    })));
    const data = dataWithImages.filter((photo) => Boolean(photo.image));
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};

export const advanceRoom = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    await resolveExpiredTurn(roomCode);
    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    if (!authenticatePlayer(room, req.body.playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    const round = req.body.round;
    if (!Number.isInteger(round) || round < 1) {
      return res.status(400).json({ success: false, message: 'Số vòng không hợp lệ.' });
    }
    res.json({ success: true, data: sanitizeRoom(room) });
  } catch (error) {
    sendError(res, error);
  }
};

export const skipRoomTurn = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    await resolveExpiredTurn(roomCode);
    const room = await Room.findOne({ roomCode }).select('+players.authTokenHash');
    if (!room) return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại.' });
    const { playerId, turnIndex: requestedTurnIndex } = req.body;
    if (!authenticatePlayer(room, playerId, req.get('x-player-token'))) {
      return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
    }
    if (!Number.isInteger(requestedTurnIndex) || requestedTurnIndex < 0) {
      return res.status(400).json({ success: false, message: 'Lượt cần bỏ qua không hợp lệ.' });
    }

    const history = room.turnHistory.find((turn) => turn.turnIndex === requestedTurnIndex);
    if (requestedTurnIndex < room.currentTurnIndex && history?.playerId === playerId
      && ['skipped', 'timed_out'].includes(history.status)) {
      return res.json({ success: true, data: sanitizeRoom(room) });
    }
    const current = turnState(room);
    if (room.status !== 'active' || requestedTurnIndex !== current.turnIndex) {
      return res.status(409).json({ success: false, message: 'Lượt chơi đã thay đổi. Hãy đồng bộ phòng trước khi bỏ lượt.' });
    }
    if (current.activePlayerId !== playerId) {
      return res.status(403).json({ success: false, message: 'Chỉ người đang có lượt mới được bỏ qua lượt này.' });
    }
    if (room.activeSubmissionId || await Submission.exists({ roomCode, turnIndex: current.turnIndex, status: 'pending' })) {
      return res.status(409).json({ success: false, message: 'Không thể bỏ lượt khi thử thách đang chờ xác thực.' });
    }

    const updated = await advanceTurn(room, 'skipped', 0);
    if (!updated) {
      const latest = await Room.findOne({ roomCode });
      const alreadyResolved = latest?.turnHistory.find((turn) => turn.turnIndex === requestedTurnIndex);
      if (alreadyResolved?.playerId === playerId && ['skipped', 'timed_out'].includes(alreadyResolved.status)) {
        return res.json({ success: true, data: sanitizeRoom(latest) });
      }
      return res.status(409).json({ success: false, message: 'Lượt đã được cập nhật đồng thời. Hãy đồng bộ phòng.', data: latest ? sanitizeRoom(latest) : undefined });
    }
    res.json({ success: true, data: sanitizeRoom(updated) });
  } catch (error) {
    sendError(res, error);
  }
};
