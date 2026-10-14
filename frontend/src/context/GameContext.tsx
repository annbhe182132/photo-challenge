import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DECK_CARDS,
  DEFAULT_DEVICE_MODE,
  DEFAULT_PHOTO_EVIDENCE,
  DEFAULT_VERIFICATION_METHOD,
  INITIAL_PLAYERS,
  type DeviceMode,
  type GameMode,
  type PhotoEvidenceSetting,
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
import { buildApprovedScore, calculateApprovalThreshold, getVotingDecision, type ScoreBreakdown } from '../utils/gameRules';
import { GameContext } from './gameContextStore';

export interface GalleryPhoto {
  id: string;
  round: number;
  image: string;
  cardTitle: string;
  score: number;
  mission: string;
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
  approve: boolean;
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

const INITIAL_ALBUMS: GalleryAlbum[] = [
  {
    id: 'album-1',
    roomCode: 'ROOM-8899',
    themeName: 'Party Đêm Đỉnh Cao',
    themeIcon: '🎉',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-101',
        round: 1,
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cạn Ly Đồng Điệu',
        score: 96,
        mission: 'Cùng 3 người bạn nâng cốc và hô 23 Dzô!',
      },
      {
        id: 'p-102',
        round: 2,
        image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cú Bay Bất Tận',
        score: 91,
        mission: 'Tạo dáng cả nhóm đang bay chân không chạm đất!',
      },
      {
        id: 'p-103',
        round: 3,
        image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Poster Phim Siêu Cấp',
        score: 98,
        mission: 'Tạo dáng Biệt Đội Siêu Anh Hùng như poster điện ảnh!',
      },
    ],
  },
  {
    id: 'album-2',
    roomCode: 'ROOM-7722',
    themeName: 'Team Building Gắn Kết',
    themeIcon: '🔥',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-201',
        round: 1,
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Tình Mẫu Tử Thiêng Liêng',
        score: 94,
        mission: 'Hai người chơi nhập vai Mẹ & Con ôm nhau ấm áp!',
      },
      {
        id: 'p-202',
        round: 2,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Góc Nhìn Khổng Lồ',
        score: 89,
        mission: 'Tạo hiệu ứng góc nhìn như đang nuốt trọn đồng đội!',
      },
      {
        id: 'p-203',
        round: 3,
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Tia Sét Biểu Cảm',
        score: 95,
        mission: '5 người chơi làm 5 biểu cảm khác nhau hoàn toàn!',
      },
    ],
  },
  {
    id: 'album-3',
    roomCode: 'ROOM-5511',
    themeName: 'Du Lịch Khám Phá',
    themeIcon: '✈️',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-301',
        round: 1,
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Check-in Hoàng Hôn',
        score: 97,
        mission: 'Tạo dáng khoảnh khắc khung hình ngược sáng nghệ thuật!',
      },
      {
        id: 'p-302',
        round: 2,
        image: 'https://images.unsplash.com/photo-1539635273304-0e8723e07312?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cú Nhảy Đồng Bộ',
        score: 92,
        mission: 'Nhảy cao cùng lúc bắt trọn khoảnh khắc giữa không trung!',
      },
      {
        id: 'p-303',
        round: 3,
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Biểu Cảm Nhí Nhảnh',
        score: 90,
        mission: 'Tạo dáng hài hước trước cảnh thiên nhiên kỳ vĩ!',
      },
    ],
  },
];

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
  photoEvidence: PhotoEvidenceSetting;
  setPhotoEvidence: (photoEvidence: PhotoEvidenceSetting) => void;
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
  castLocalVote: (submissionId: string, voterId: string, approve: boolean) => GameSubmission | null;
  syncRoom: (room: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
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
  photoEvidence?: PhotoEvidenceSetting;
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
  const [roomCode, setRoomCode] = useState<string>(persisted.roomCode ?? 'ROOM-8899');
  const [theme, setTheme] = useState<ThemeOption>(persisted.theme ?? THEMES[0]);
  const [mode, setMode] = useState<GameMode>(persisted.mode ?? 'spicy');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(persisted.deviceMode ?? DEFAULT_DEVICE_MODE);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(
    persisted.verificationMethod === 'ai' ? 'group' : persisted.verificationMethod ?? DEFAULT_VERIFICATION_METHOD
  );
  const [photoEvidence, setPhotoEvidence] = useState<PhotoEvidenceSetting>(persisted.photoEvidence ?? DEFAULT_PHOTO_EVIDENCE);
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
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>(
    persisted.gameStatus === 'active' || persisted.gameStatus === 'completed' ? persisted.gameStatus : 'waiting'
  );
  const [turnHistory, setTurnHistory] = useState<GameTurnRecord[]>(persisted.turnHistory ?? []);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(persisted.currentPlayerId ?? null);
  const [roomPlayerToken, setRoomPlayerToken] = useState<string | null>(persisted.roomPlayerToken ?? null);
  const [activeCard, setActiveCard] = useState<PhysicalCard>(persisted.activeCard ?? DECK_CARDS[0]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>(persisted.albums ?? INITIAL_ALBUMS);
  const [submissions, setSubmissions] = useState<GameSubmission[]>(
    (persisted.submissions ?? []).map((submission) => ({
      ...submission,
      turnIndex: Number.isInteger(submission.turnIndex) ? submission.turnIndex : Math.max(0, submission.round - 1),
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
        photoEvidence,
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
  }, [roomCode, theme, mode, deviceMode, verificationMethod, photoEvidence, photoBonusEnabled, players, currentRound, totalRounds, gameStatus, soundEnabled, turnDurationSeconds, currentTurnIndex, activePlayerId, turnStartedAt, turnDeadline, turnHistory, currentPlayerId, roomPlayerToken, activeCard, albums, submissions, usedCardCodes]);

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
    const eligibleVoterIds = players.filter((player) => player.id !== data.playerId).map((player) => player.id);
    if (eligibleVoterIds.length === 0) {
      throw new Error('Xác thực nhóm cần ít nhất một người chơi khác để đánh giá.');
    }
    if (submissions.some((submission) =>
      submission.round === data.round
      && submission.turnIndex === currentTurnIndex
      && submission.playerId === data.playerId
    )) {
      throw new Error('Lượt này đã có thử thách được gửi.');
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

  const castLocalVote = (submissionId: string, voterId: string, approve: boolean) => {
    const current = submissions.find((submission) => submission.id === submissionId);
    if (!current || current.status !== 'pending') return current ?? null;
    if (!current.eligibleVoterIds.includes(voterId) || current.playerId === voterId) {
      throw new Error('Người chơi này không đủ điều kiện bỏ phiếu cho thử thách.');
    }
    if (current.votes.some((vote) => vote.playerId === voterId)) {
      throw new Error('Người chơi này đã bỏ phiếu cho thử thách.');
    }

    const votes = [...current.votes, { playerId: voterId, approve }];
    const yesVotes = votes.filter((vote) => vote.approve).length;
    const status = getVotingDecision({
      yesVotes,
      votesCast: votes.length,
      eligibleVoterCount: current.eligibleVoterIds.length,
    });
    const approvedScore = status === 'approved'
      ? buildApprovedScore(photoBonusEnabled, photoEvidence, Boolean(current.evidence))
      : { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 };
    const updated: GameSubmission = { ...current, votes, status, scoreBreakdown: approvedScore };
    setSubmissions((previous) => previous.map((submission) => submission.id === submissionId ? updated : submission));

    if (status === 'approved') {
      addScoreToPlayer(current.playerId, approvedScore.total);
      if (current.evidence) {
        addPhotoToCurrentAlbum({
          round: current.round,
          image: current.evidence,
          cardTitle: current.cardTitle,
          score: approvedScore.total,
          mission: current.mission,
        });
      }
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
    if (room.turnHistory !== undefined) setTurnHistory(room.turnHistory);
    setGameStatus(room.status);
  }, []);

  const startLocalTurn = () => {
    if (deviceMode !== 'single_device' || gameStatus === 'completed') return;
    const player = players[currentTurnIndex % (players.length || 1)];
    const now = new Date();
    setActivePlayerId(player?.id ?? null);
    setTurnStartedAt(now.toISOString());
    setTurnDeadline(turnDurationSeconds ? new Date(now.getTime() + turnDurationSeconds * 1000).toISOString() : null);
    setGameStatus('active');
  };

  const advanceLocalTurn = (requestedStatus?: GameTurnRecord['status']) => {
    if (deviceMode !== 'single_device' || gameStatus !== 'active') {
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
    const now = new Date();
    setTurnHistory((previous) => [...previous, record]);
    setCurrentTurnIndex(nextTurnIndex);
    setCurrentRound(completed ? totalRounds : nextRound);
    setActivePlayerId(nextPlayer);
    setGameStatus(completed ? 'completed' : 'active');
    setTurnStartedAt(completed ? null : now.toISOString());
    setTurnDeadline(completed || !turnDurationSeconds
      ? null
      : new Date(now.getTime() + turnDurationSeconds * 1000).toISOString());
    return { roundChanged, completed };
  };

  const beginLocalGame = () => {
    setCurrentRound(1);
    setCurrentTurnIndex(0);
    setActivePlayerId(null);
    setGameStatus('waiting');
    setTurnStartedAt(null);
    setTurnDeadline(null);
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
    setPhotoEvidence(DEFAULT_PHOTO_EVIDENCE);
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
        photoEvidence,
        setPhotoEvidence,
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
        syncRoom,
        beginLocalGame,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
