import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DECK_CARDS,
  DEFAULT_DEVICE_MODE,
  DEFAULT_VERIFICATION_METHOD,
  INITIAL_PLAYERS,
  type DeviceMode,
  type GameMode,
  type PhysicalCard,
  type Player,
  DEFAULT_ROUND_LIMIT,
  DEFAULT_TURN_DURATION,
  type RoundLimit,
  THEMES,
  type TurnDurationSeconds,
  type ThemeOption,
  type VerificationMethod,
} from '../data/gameData';
import { sound } from '../utils/soundEngine';
import {
  buildApprovedScore,
  calculateApprovalThreshold,
  calculateGroupScore,
  getVotingDecision,
  isGroupRatingApproval,
  isValidGroupScore,
  type ScoreBreakdown,
} from '../utils/gameRules';
import { GameContext } from './gameContextStore';

export interface GalleryPhoto {
  id: string;
  round: number;
  image: string;
  cardTitle: string;
  score: number;
  mission: string;
  passed?: boolean;
  playerName?: string;
}

export interface GalleryAlbum {
  id: string;
  roomCode: string;
  themeName: string;
  themeIcon: string;
  date: string;
  coverImage: string;
  photos: GalleryPhoto[];
}

export interface GameVote {
  playerId: string;
  approve?: boolean;
  score?: number;
}

export interface GameSubmission {
  id: string;
  round: number;
  turnIndex: number;
  playerId: string;
  cardCode: string;
  cardTitle: string;
  mission: string;
  evidence: string | null;
  eligibleVoterIds: string[];
  requiredVotes: number;
  votes: GameVote[];
  groupScore?: number | null;
  voteCount?: number;
  status: 'pending' | 'approved' | 'rejected';
  scoreBreakdown: ScoreBreakdown;
  hasVoted?: boolean;
}

export interface GameTurnRecord {
  turnIndex: number;
  round: number;
  playerId: string;
  status: 'completed' | 'failed' | 'timed_out' | 'skipped';
  score: number;
}

export interface GameContextType {
  roomCode: string;
  setRoomCode: (code: string) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (deviceMode: DeviceMode) => void;
  verificationMethod: VerificationMethod;
  setVerificationMethod: (verificationMethod: VerificationMethod) => void;
  photoBonusEnabled: boolean;
  setPhotoBonusEnabled: (enabled: boolean) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  getCurrentPlayer: (r?: number) => Player;
  addScoreToPlayer: (playerId: string, xp: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  investorMode: boolean;
  toggleInvestorMode: () => void;
  currentRound: number;
  setCurrentRound: (r: number) => void;
  totalRounds: RoundLimit;
  setTotalRounds: (rounds: RoundLimit) => void;
  turnDurationSeconds: TurnDurationSeconds;
  setTurnDurationSeconds: (duration: TurnDurationSeconds) => void;
  currentTurnIndex: number;
  activePlayerId: string | null;
  turnStartedAt: string | null;
  turnDeadline: string | null;
  serverTimeOffsetMs: number;
  pausedTurnRemainingSeconds: number | null;
  pauseTurnClock: () => void;
  gameStatus: 'waiting' | 'active' | 'completed';
  turnHistory: GameTurnRecord[];
  startLocalTurn: () => void;
  advanceLocalTurn: (status?: 'completed' | 'failed' | 'timed_out' | 'skipped') => {
    roundChanged: boolean;
    completed: boolean;
  };
  currentPlayerId: string | null;
  setCurrentPlayerId: (id: string | null) => void;
  roomPlayerToken: string | null;
  setRoomPlayerToken: (token: string | null) => void;
  activeCard: PhysicalCard;
  setActiveCard: (card: PhysicalCard) => void;
  albums: GalleryAlbum[];
  setAlbums: React.Dispatch<React.SetStateAction<GalleryAlbum[]>>;
  addPhotoToCurrentAlbum: (photo: Omit<GalleryPhoto, 'id'>) => string;
  updateGalleryPhotoScore: (photoId: string, score: number) => void;
  submissions: GameSubmission[];
  addLocalSubmission: (submission: Omit<GameSubmission, 'id' | 'turnIndex' | 'eligibleVoterIds' | 'requiredVotes' | 'votes' | 'status' | 'scoreBreakdown'>) => GameSubmission;
  castLocalVote: (submissionId: string, voterId: string, score: number) => GameSubmission | null;
  resolveLocalAiSubmission: (submissionId: string, passed: boolean, scoreBreakdown: ScoreBreakdown) => GameSubmission | null;
  syncRoom: (room: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
    serverNow?: string;
    turnRemainingSeconds?: number | null;
    turnHistory?: GameTurnRecord[];
    turnDurationSeconds?: TurnDurationSeconds;
  }) => void;
  beginLocalGame: () => void;
  resetGame: () => void;
}

const STORAGE_KEY = 'snapdeck-game-state-v1';
interface StoredGameState {
  roomCode?: string;
  theme?: ThemeOption;
  mode?: GameMode;
  deviceMode?: DeviceMode;
  verificationMethod?: VerificationMethod;
  photoBonusEnabled?: boolean;
  players?: Player[];
  currentRound?: number;
  totalRounds?: number;
  gameStatus?: 'waiting' | 'active' | 'completed';
  soundEnabled?: boolean;
  turnDurationSeconds?: TurnDurationSeconds;
  currentTurnIndex?: number;
  activePlayerId?: string | null;
  turnStartedAt?: string | null;
  turnDeadline?: string | null;
  pausedTurnRemainingSeconds?: number | null;
  turnHistory?: GameTurnRecord[];
  currentPlayerId?: string | null;
  roomPlayerToken?: string | null;
  activeCard?: PhysicalCard;
  albums?: GalleryAlbum[];
  submissions?: GameSubmission[];
  usedCardCodes?: string[];
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const readStoredState = () => {
    if (typeof window === 'undefined') return {} as StoredGameState;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as StoredGameState : {};
    } catch {
      return {};
    }
  };

  const persisted = useMemo(() => readStoredState(), []);
  const [roomCode, setRoomCode] = useState<string>(
    persisted.roomCode === 'ROOM-8899' ? '' : persisted.roomCode ?? ''
  );
  const [theme, setTheme] = useState<ThemeOption>(persisted.theme ?? THEMES[0]);
  const [mode, setMode] = useState<GameMode>(persisted.mode ?? 'spicy');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(persisted.deviceMode ?? DEFAULT_DEVICE_MODE);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(
    persisted.verificationMethod ?? DEFAULT_VERIFICATION_METHOD
  );
  const [photoBonusEnabled, setPhotoBonusEnabled] = useState(persisted.photoBonusEnabled ?? true);
  const [players, setPlayers] = useState<Player[]>(persisted.players ?? INITIAL_PLAYERS);
  const [soundEnabled, setSoundEnabled] = useState(persisted.soundEnabled ?? true);
  const [investorMode, setInvestorMode] = useState(true);
  const [currentRound, setCurrentRound] = useState<number>(persisted.currentRound ?? 1);
  const [totalRounds, setTotalRounds] = useState<RoundLimit>(
    [0, 3, 5, 10].includes(persisted.totalRounds ?? -1)
      ? persisted.totalRounds as RoundLimit
      : DEFAULT_ROUND_LIMIT
  );
  const [turnDurationSeconds, setTurnDurationSeconds] = useState<TurnDurationSeconds>(
    [0, 15, 30, 60].includes(persisted.turnDurationSeconds ?? -1)
      ? persisted.turnDurationSeconds as TurnDurationSeconds
      : DEFAULT_TURN_DURATION
  );
  const [currentTurnIndex, setCurrentTurnIndex] = useState(persisted.currentTurnIndex ?? 0);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(persisted.activePlayerId ?? null);
  const [turnStartedAt, setTurnStartedAt] = useState<string | null>(persisted.turnStartedAt ?? null);
  const [turnDeadline, setTurnDeadline] = useState<string | null>(persisted.turnDeadline ?? null);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [pausedTurnRemainingSeconds, setPausedTurnRemainingSeconds] = useState<number | null>(
    typeof persisted.pausedTurnRemainingSeconds === 'number' ? persisted.pausedTurnRemainingSeconds : null
  );
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>(
    persisted.gameStatus === 'active' || persisted.gameStatus === 'completed' ? persisted.gameStatus : 'waiting'
  );
  const [turnHistory, setTurnHistory] = useState<GameTurnRecord[]>(persisted.turnHistory ?? []);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(persisted.currentPlayerId ?? null);
  const [roomPlayerToken, setRoomPlayerToken] = useState<string | null>(persisted.roomPlayerToken ?? null);
  const [activeCard, setActiveCard] = useState<PhysicalCard>(persisted.activeCard ?? DECK_CARDS[0]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>(
    (persisted.albums ?? []).filter((album) => !['album-1', 'album-2', 'album-3'].includes(album.id))
  );
  const [submissions, setSubmissions] = useState<GameSubmission[]>(
    (persisted.submissions ?? []).map((submission) => ({
      ...submission,
      turnIndex: Number.isInteger(submission.turnIndex) ? submission.turnIndex : Math.max(0, submission.round - 1),
      groupScore: submission.groupScore ?? calculateGroupScore(submission.votes),
    }))
  );
  const [usedCardCodes, setUsedCardCodes] = useState<string[]>(persisted.usedCardCodes ?? []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomCode,
        theme,
        mode,
        deviceMode,
        verificationMethod,
        photoBonusEnabled,
        players,
        currentRound,
        totalRounds,
        gameStatus,
        soundEnabled,
        turnDurationSeconds,
        currentTurnIndex,
        activePlayerId,
        turnStartedAt,
        turnDeadline,
        pausedTurnRemainingSeconds,
        turnHistory,
        currentPlayerId,
        roomPlayerToken,
        activeCard,
        albums,
        setAlbums,
        submissions,
        usedCardCodes,
      }));
    } catch (error) {
      console.warn('[GameContext] Could not persist the complete local game state:', error);
    }
  }, [roomCode, theme, mode, deviceMode, verificationMethod, photoBonusEnabled, players, currentRound, totalRounds, gameStatus, soundEnabled, turnDurationSeconds, currentTurnIndex, activePlayerId, turnStartedAt, turnDeadline, pausedTurnRemainingSeconds, turnHistory, currentPlayerId, roomPlayerToken, activeCard, albums, submissions, usedCardCodes]);

  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  const getCurrentPlayer = (r?: number): Player => {
    const targetRound = r ?? currentRound;
    if (targetRound === currentRound && activePlayerId) {
      return players.find((player) => player.id === activePlayerId) ?? INITIAL_PLAYERS[0];
    }
    const index = targetRound === currentRound
      ? currentTurnIndex % (players.length || 1)
      : (targetRound - 1) % (players.length || 1);
    return players[index] || INITIAL_PLAYERS[0];
  };

  const addScoreToPlayer = (playerId: string, xp: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, score: p.score + xp } : p))
    );
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    sound.enabled = nextState;
    setSoundEnabled(nextState);
    if (nextState) sound.playClick();
  };

  const toggleInvestorMode = () => {
    setInvestorMode((prev) => !prev);
    sound.playClick();
  };

  const addPhotoToCurrentAlbum = (photoData: Omit<GalleryPhoto, 'id'>) => {
    const photoId = `p-${Date.now()}`;
    const newPhoto: GalleryPhoto = {
      id: photoId,
      ...photoData,
    };

    setAlbums((prev) => {
      // Find active room album or prepend to the first album
      const targetAlbumIndex = prev.findIndex((a) => a.roomCode === roomCode);
      if (targetAlbumIndex >= 0) {
        const updated = [...prev];
        updated[targetAlbumIndex] = {
          ...updated[targetAlbumIndex],
          coverImage: newPhoto.image,
          photos: [newPhoto, ...updated[targetAlbumIndex].photos],
        };
        return updated;
      } else {
        // Create new album for current room
        const newAlbum: GalleryAlbum = {
          id: `album-${Date.now()}`,
          roomCode,
          themeName: theme.name,
          themeIcon: theme.icon,
          date: new Date().toLocaleDateString('vi-VN'),
          coverImage: newPhoto.image,
          photos: [newPhoto],
        };
        return [newAlbum, ...prev];
      }
    });
    return photoId;
  };

  const updateGalleryPhotoScore = (photoId: string, score: number) => {
    setAlbums((prev) => prev.map((album) => ({
      ...album,
      photos: album.photos.map((photo) => (
        photo.id === photoId ? { ...photo, score } : photo
      )),
    })));
  };

  const addLocalSubmission = (
    data: Omit<GameSubmission, 'id' | 'turnIndex' | 'eligibleVoterIds' | 'requiredVotes' | 'votes' | 'status' | 'scoreBreakdown'>
  ) => {
    const isAi = verificationMethod === 'ai';
    const eligibleVoterIds = isAi
      ? ['ai-judge']
      : players.filter((player) => player.id !== data.playerId).map((player) => player.id);
    if (!isAi && eligibleVoterIds.length === 0) {
      throw new Error('Xác thực nhóm cần ít nhất một người chơi khác để đánh giá.');
    }
    if (submissions.some((submission) =>
      submission.round === data.round
      && submission.turnIndex === currentTurnIndex
      && submission.playerId === data.playerId
    )) {
      throw new Error('Lượt này đã có thử thách được gửi.');
    }
    if (verificationMethod === 'ai' && !data.evidence) {
      throw new Error('Xác thực AI bắt buộc có ảnh bằng chứng. Hãy chụp ảnh trước khi gửi.');
    }
    if (usedCardCodes.includes(data.cardCode)) {
      throw new Error('Thẻ này đã được chơi trong ván hiện tại. Hãy chọn một thẻ khác.');
    }
    const currentPlayer = players[currentTurnIndex % (players.length || 1)];
    if (data.round !== currentRound || currentPlayer?.id !== data.playerId) {
      throw new Error('Không thể gửi thử thách ngoài lượt chơi hiện tại.');
    }
    if (turnDeadline && Date.now() > new Date(turnDeadline).getTime()) {
      throw new Error('Thời gian lượt đã hết. Thử thách chưa được ghi nhận và không có điểm thưởng.');
    }
    const submission: GameSubmission = {
      ...data,
      turnIndex: currentTurnIndex,
      id: `local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      eligibleVoterIds,
      requiredVotes: calculateApprovalThreshold(eligibleVoterIds.length),
      votes: [],
      status: 'pending',
      scoreBreakdown: { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 },
    };
    setSubmissions((previous) => [...previous, submission]);
    setUsedCardCodes((previous) => [...previous, data.cardCode]);
    return submission;
  };

  const castLocalVote = (submissionId: string, voterId: string, score: number) => {
    if (!isValidGroupScore(score)) {
      throw new Error('Điểm đánh giá phải là số nguyên từ 0 đến 100.');
    }
    const current = submissions.find((submission) => submission.id === submissionId);
    if (!current || current.status !== 'pending') return current ?? null;
    if (!current.eligibleVoterIds.includes(voterId) || current.playerId === voterId) {
      throw new Error('Người chơi này không đủ điều kiện bỏ phiếu cho thử thách.');
    }
    if (current.votes.some((vote) => vote.playerId === voterId)) {
      throw new Error('Người chơi này đã bỏ phiếu cho thử thách.');
    }

    const votes = [...current.votes, { playerId: voterId, score, approve: isGroupRatingApproval(score) }];
    const yesVotes = votes.filter((vote) => vote.approve).length;
    const status = getVotingDecision({
      yesVotes,
      votesCast: votes.length,
      eligibleVoterCount: current.eligibleVoterIds.length,
    });
    const approvedScore = status === 'approved'
      ? buildApprovedScore(photoBonusEnabled, Boolean(current.evidence))
      : { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 };
    const updated: GameSubmission = {
      ...current,
      votes,
      groupScore: calculateGroupScore(votes),
      status,
      scoreBreakdown: approvedScore,
    };
    setSubmissions((previous) => previous.map((submission) => submission.id === submissionId ? updated : submission));

    if (status === 'approved') addScoreToPlayer(current.playerId, approvedScore.total);
    if (status === 'approved' || status === 'rejected') {
      if (current.evidence) {
        addPhotoToCurrentAlbum({
          round: current.round,
          image: current.evidence,
          cardTitle: current.cardTitle,
          score: approvedScore.total,
          mission: current.mission,
          passed: status === 'approved',
          playerName: players.find((player) => player.id === current.playerId)?.name ?? 'Người chơi',
        });
      }
    }
    return updated;
  };

  const resolveLocalAiSubmission = (
    submissionId: string,
    passed: boolean,
    scoreBreakdown: ScoreBreakdown
  ) => {
    const current = submissions.find((submission) => submission.id === submissionId);
    if (!current || current.status !== 'pending') return current ?? null;

    const status = passed ? 'approved' : 'rejected';
    const approvedScore = passed
      ? scoreBreakdown
      : { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 };
    const updated: GameSubmission = {
      ...current,
      status,
      scoreBreakdown: approvedScore,
    };
    setSubmissions((previous) => previous.map((submission) => submission.id === submissionId ? updated : submission));

    if (passed) addScoreToPlayer(current.playerId, approvedScore.total);
    if (current.evidence) {
      addPhotoToCurrentAlbum({
        round: current.round,
        image: current.evidence,
        cardTitle: current.cardTitle,
        score: approvedScore.total,
        mission: current.mission,
        passed,
        playerName: players.find((player) => player.id === current.playerId)?.name ?? 'Người chơi',
      });
    }
    return updated;
  };

  const syncRoom = useCallback((room: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
    serverNow?: string;
    turnRemainingSeconds?: number | null;
    turnHistory?: GameTurnRecord[];
    turnDurationSeconds?: TurnDurationSeconds;
  }) => {
    setPlayers(room.players);
    setCurrentRound(room.currentRound);
    if (room.status !== 'waiting') {
      setTotalRounds(([0, 3, 5, 10].includes(room.totalRounds) ? room.totalRounds : DEFAULT_ROUND_LIMIT) as RoundLimit);
      if (room.turnDurationSeconds !== undefined) setTurnDurationSeconds(room.turnDurationSeconds);
    }
    if (room.currentTurnIndex !== undefined) setCurrentTurnIndex(room.currentTurnIndex);
    if (room.activePlayerId !== undefined) setActivePlayerId(room.activePlayerId);
    if (room.turnStartedAt !== undefined) setTurnStartedAt(room.turnStartedAt);
    if (room.turnDeadline !== undefined) setTurnDeadline(room.turnDeadline);
    if (room.serverNow) setServerTimeOffsetMs(new Date(room.serverNow).getTime() - Date.now());
    if (room.turnDeadline) setPausedTurnRemainingSeconds(null);
    else if (room.turnRemainingSeconds !== undefined) setPausedTurnRemainingSeconds(room.turnRemainingSeconds);
    if (room.turnHistory !== undefined) setTurnHistory(room.turnHistory);
    setGameStatus(room.status);
  }, []);

  const pauseTurnClock = () => {
    if (!turnDeadline) return;
    const remaining = Math.max(0, Math.ceil((new Date(turnDeadline).getTime() - (Date.now() + serverTimeOffsetMs)) / 1000));
    setPausedTurnRemainingSeconds(remaining);
    setTurnStartedAt(null);
    setTurnDeadline(null);

    // Persist synchronously as well: React effects might not run before the tab closes.
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) as StoredGameState : {};
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...stored,
          turnStartedAt: null,
          turnDeadline: null,
          pausedTurnRemainingSeconds: remaining,
        }));
      } catch (error) {
        console.warn('[GameContext] Could not persist paused timer state:', error);
      }
    }
  };

  const startLocalTurn = () => {
    // Do not start the clock before CameraPage confirms a live video feed.
    if (deviceMode !== 'single_device' || gameStatus === 'completed') return;

    // A stale persisted timestamp must not prevent a new/waiting game from becoming active.
    // Once an active turn has started, opening the camera again must not reset its deadline.
    if (gameStatus === 'active' && turnStartedAt) return;

    const player = players[currentTurnIndex % (players.length || 1)];
    const now = new Date();
    const resumedSeconds = pausedTurnRemainingSeconds;
    const durationSeconds = resumedSeconds ?? turnDurationSeconds;
    setActivePlayerId(player?.id ?? null);
    setTurnStartedAt(now.toISOString());
    setTurnDeadline(durationSeconds > 0
      ? new Date(now.getTime() + durationSeconds * 1000).toISOString()
      : turnDurationSeconds > 0 ? now.toISOString() : null);
    setPausedTurnRemainingSeconds(null);
    setGameStatus('active');
  };

  const advanceLocalTurn = (requestedStatus?: GameTurnRecord['status']) => {
    // A player may finish using the upload/no-photo fallback without ever opening a live
    // camera feed. In that case gameStatus can still be 'waiting', even though a valid
    // approved/rejected submission now exists. Validate the actual turn result below
    // instead of blocking advancement solely on this UI lifecycle flag.
    if (deviceMode !== 'single_device' || gameStatus === 'completed') {
      throw new Error('Không thể chuyển lượt trong trạng thái ván chơi hiện tại.');
    }
    const currentTurnSubmission = submissions.find((submission) => (
      submission.turnIndex === currentTurnIndex && submission.round === currentRound
    ));
    if (currentTurnSubmission?.status === 'pending') {
      throw new Error('Lượt chưa thể chuyển khi kết quả vẫn đang chờ xác thực.');
    }
    const turnStatus = requestedStatus
      ?? (currentTurnSubmission?.status === 'approved' ? 'completed' : currentTurnSubmission?.status === 'rejected' ? 'failed' : undefined);
    if (!turnStatus) throw new Error('Lượt cần được xác thực hoặc hết giờ trước khi chuyển tiếp.');
    if (turnStatus === 'completed' && currentTurnSubmission?.status !== 'approved') {
      throw new Error('Chỉ thử thách đã được duyệt mới được ghi nhận hoàn thành.');
    }
    if (turnStatus === 'failed' && currentTurnSubmission?.status !== 'rejected') {
      throw new Error('Lượt thất bại phải được xử lý qua bước xác thực.');
    }
    if (['timed_out', 'skipped'].includes(turnStatus) && currentTurnSubmission) {
      throw new Error('Không thể hết giờ hoặc bỏ lượt sau khi đã gửi thử thách.');
    }

    const currentPlayer = players.find((player) => player.id === activePlayerId)
      ?? players[currentTurnIndex % (players.length || 1)];
    const score = turnStatus === 'completed' ? currentTurnSubmission?.scoreBreakdown.total ?? 0 : 0;
    const record: GameTurnRecord = {
      turnIndex: currentTurnIndex,
      round: currentRound,
      playerId: currentPlayer?.id ?? '',
      status: turnStatus,
      score,
    };
    const nextTurnIndex = currentTurnIndex + 1;
    const nextRound = Math.floor(nextTurnIndex / (players.length || 1)) + 1;
    const completed = totalRounds > 0 && nextTurnIndex >= totalRounds * players.length;
    const roundChanged = !completed && nextRound > currentRound;
    const nextPlayer = completed ? null : players[nextTurnIndex % (players.length || 1)]?.id ?? null;
    setTurnHistory((previous) => [...previous, record]);
    setCurrentTurnIndex(nextTurnIndex);
    setCurrentRound(completed ? totalRounds : nextRound);
    setActivePlayerId(nextPlayer);
    setGameStatus(completed ? 'completed' : 'active');
    // The next player's clock is armed only when their camera feed becomes live.
    setTurnStartedAt(null);
    setTurnDeadline(null);
    setPausedTurnRemainingSeconds(null);
    return { roundChanged, completed };
  };

  const beginLocalGame = () => {
    setCurrentRound(1);
    setCurrentTurnIndex(0);
    setActivePlayerId(null);
    setGameStatus('waiting');
    setTurnStartedAt(null);
    setTurnDeadline(null);
    setPausedTurnRemainingSeconds(null);
    setTurnHistory([]);
    setActiveCard(DECK_CARDS[0]);
    setSubmissions([]);
    setUsedCardCodes([]);
  };

  const resetGame = () => {
    setCurrentRound(1);
    setTotalRounds(DEFAULT_ROUND_LIMIT);
    setTurnDurationSeconds(DEFAULT_TURN_DURATION);
    setCurrentTurnIndex(0);
    setActivePlayerId(null);
    setTurnStartedAt(null);
    setTurnDeadline(null);
    setPausedTurnRemainingSeconds(null);
    setGameStatus('waiting');
    setTurnHistory([]);
    setActiveCard(DECK_CARDS[0]);
    setPlayers([]);
    setCurrentPlayerId(null);
    setRoomPlayerToken(null);
    setSubmissions([]);
    setUsedCardCodes([]);
    setAlbums([]);
    setDeviceMode(DEFAULT_DEVICE_MODE);
    setVerificationMethod(DEFAULT_VERIFICATION_METHOD);
    setPhotoBonusEnabled(true);
  };

  return (
    <GameContext.Provider
      value={{
        roomCode,
        setRoomCode,
        theme,
        setTheme,
        mode,
        setMode,
        deviceMode,
        setDeviceMode,
        verificationMethod,
        setVerificationMethod,
        photoBonusEnabled,
        setPhotoBonusEnabled,
        players,
        setPlayers,
        getCurrentPlayer,
        addScoreToPlayer,
        soundEnabled,
        toggleSound,
        investorMode,
        toggleInvestorMode,
        currentRound,
        setCurrentRound,
        totalRounds,
        setTotalRounds,
        turnDurationSeconds,
        setTurnDurationSeconds,
        currentTurnIndex,
        activePlayerId,
        turnStartedAt,
        turnDeadline,
        serverTimeOffsetMs,
        pausedTurnRemainingSeconds,
        pauseTurnClock,
        gameStatus,
        turnHistory,
        startLocalTurn,
        advanceLocalTurn,
        currentPlayerId,
        setCurrentPlayerId,
        roomPlayerToken,
        setRoomPlayerToken,
        activeCard,
        setActiveCard,
        albums,
        setAlbums,
        addPhotoToCurrentAlbum,
        updateGalleryPhotoScore,
        submissions,
        addLocalSubmission,
        castLocalVote,
        resolveLocalAiSubmission,
        syncRoom,
        beginLocalGame,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
