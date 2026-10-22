import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShieldX,
  Sparkles,
  Bot,
  AlertTriangle,
  RefreshCw,
  Users,
  Zap,
  Tag,
  Maximize2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GameSubmission } from '../../context/GameContext';
import { useGame } from '../../context/useGame';
import { ThemeToggle } from '../../components/ThemeToggle';
import type { Player } from '../../data/gameData';
import { apiRequest, playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

interface AIAnalysisResult {
  passed: boolean;
  matchPercentage?: number;
  verdict: string;
  score: number;
  scoreBreakdown: {
    basePoints: number;
    photoBonus: number;
    creativityBonus: number;
    total: number;
  };
  feedback: string;
  detectedElements: string[];
  confidence: number;
  modelUsed?: string;
}

interface AIResponse {
  success: boolean;
  data?: AIAnalysisResult;
  message?: string;
}

interface SubmissionResponse {
  success: boolean;
  data?: GameSubmission | {
    _id: string;
    roomCode: string;
    round: number;
    turnIndex?: number;
    playerId: string;
    cardCode: string;
    cardTitle: string;
    mission: string;
    evidence?: string | null;
    hasEvidence: boolean;
    eligibleVoterIds: string[];
    eligibleVoterCount: number;
    requiredVotes: number;
    voteCount: number;
    hasVoted: boolean;
    groupScore?: number | null;
    status: 'pending' | 'approved' | 'rejected';
    scoreBreakdown: GameSubmission['scoreBreakdown'];
  };
}

interface RoomResponse {
  success: boolean;
  data?: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
    turnRemainingSeconds?: number | null;
    turnDurationSeconds?: 0 | 15 | 30 | 60;
  };
}

interface SubmissionListResponse {
  success: boolean;
  data?: Array<NonNullable<SubmissionResponse['data']>>;
}

const AI_SCANNING_TIPS = [
  '🤖 SNAPDECK AI Judge đang khởi động cảm biến...',
  '🔍 Phân tích bố cục và nhận diện gương mặt...',
  '🎯 Kiểm tra đạo cụ, phụ kiện và không gian...',
  '✨ Đánh giá thần thái, biểu cảm và độ sáng tạo...',
  '⚖️ Đối chiếu với tiêu chí thử thách từ database...',
  '📝 Đang tính toán điểm số và soạn lời nhận xét...',
];

const EvidenceImage = ({ src, onOpen }: { src: string; onOpen: () => void }) => {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  return (
    <>
      {!loaded && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-300">
          <LoaderCircle className="mr-2 animate-spin" /> Đang tải ảnh…
        </div>
      )}
      {loadError ? (
        <div role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-200">
          Không thể tải ảnh bằng chứng.
        </div>
      ) : (
        <button
          type="button"
          className="absolute inset-0 h-full w-full cursor-zoom-in"
          onClick={onOpen}
          aria-label="Mở ảnh bằng chứng kích thước lớn"
        >
          <img
            src={src}
            alt="Bằng chứng thử thách"
            onLoad={() => setLoaded(true)}
            onError={() => setLoadError(true)}
            className="h-full w-full object-contain"
          />
        </button>
      )}
    </>
  );
};

const asGameSubmission = (submission: NonNullable<SubmissionResponse['data']>): GameSubmission => ({
  id: 'id' in submission ? submission.id : submission._id,
  round: submission.round,
  turnIndex: submission.turnIndex ?? submission.round - 1,
  playerId: submission.playerId,
  cardCode: submission.cardCode,
  cardTitle: submission.cardTitle,
  mission: submission.mission,
  evidence: submission.evidence ?? null,
  eligibleVoterIds: submission.eligibleVoterIds,
  requiredVotes: submission.requiredVotes,
  votes: 'votes' in submission ? submission.votes : [],
  voteCount: 'voteCount' in submission ? submission.voteCount : undefined,
  status: submission.status,
  scoreBreakdown: submission.scoreBreakdown,
  hasVoted: 'hasVoted' in submission ? submission.hasVoted : undefined,
  groupScore: 'groupScore' in submission ? submission.groupScore : undefined,
});

const AIVerifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    roomCode,
    deviceMode,
    currentPlayerId,
    roomPlayerToken,
    players,
    submissions,
    castLocalVote,
    resolveLocalAiSubmission,
    syncRoom,
    verificationMethod,
    setVerificationMethod,
    activeCard,
    theme,
    themeMode,
  } = useGame();

  const isLight = themeMode === 'light';

  const searchParams = new URLSearchParams(location.search);
  const round = (location.state?.round as number | undefined) ?? (Number(searchParams.get('round')) || undefined);
  const submissionId = (location.state?.submissionId as string | undefined)
    ?? searchParams.get('submissionId')
    ?? undefined;

  const [remoteSubmission, setRemoteSubmission] = useState<GameSubmission | null>(null);
  const [loading, setLoading] = useState(deviceMode === 'multi_device' && Boolean(submissionId));
  const [submittingVote, setSubmittingVote] = useState(false);
  const [error, setError] = useState<string | null>(
    submissionId ? null : 'Thiếu mã lượt gửi. Hãy quay lại thử thách và gửi lại.'
  );

  // AI Verification State
  const [aiState, setAiState] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const hasTriggeredAi = useRef(false);
  const aiRequestInProgress = useRef(false);
  const submittingVoteRef = useRef(false);
  const [selectedGroupScore, setSelectedGroupScore] = useState(80);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Close image modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsImageModalOpen(false);
    };
    if (isImageModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen]);

  const submission = deviceMode === 'single_device'
    ? submissions.find((candidate) => candidate.id === submissionId) ?? null
    : remoteSubmission;

  const nextLocalVoter = deviceMode === 'single_device' && submission
    ? players.find((player) =>
        submission.eligibleVoterIds.includes(player.id)
        && !submission.votes.some((vote) => vote.playerId === player.id)
      )
    : undefined;
  const activeVoterId = deviceMode === 'single_device' ? nextLocalVoter?.id : currentPlayerId;

  // Ticker for AI tips during analysis
  useEffect(() => {
    if (aiState !== 'analyzing') return undefined;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % AI_SCANNING_TIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [aiState]);

  const loadMultiplayerState = useCallback(async () => {
    if (!currentPlayerId || !submissionId) {
      setError('Không xác định được người chơi hoặc lượt gửi. Hãy tham gia lại phòng.');
      setLoading(false);
      return;
    }
    try {
      const [roomResponse, listResponse] = await Promise.all([
        apiRequest<RoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}`),
        playerApiRequest<SubmissionListResponse>(
          roomPlayerToken,
          `/api/rooms/${encodeURIComponent(roomCode)}/submissions?playerId=${encodeURIComponent(currentPlayerId)}${round ? `&round=${round}` : ''}`
        ),
      ]);
      if (roomResponse.success && roomResponse.data) syncRoom(roomResponse.data);
      const match = listResponse.data?.find((item) => {
        const id = 'id' in item ? item.id : item._id;
        return id === submissionId;
      });
      if (!listResponse.success || !match) throw new Error('Lượt gửi không còn khả dụng trong phòng này.');
      setRemoteSubmission(asGameSubmission(match));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể đồng bộ lượt bình chọn.');
    } finally {
      setLoading(false);
    }
  }, [currentPlayerId, roomCode, roomPlayerToken, round, submissionId, syncRoom]);

  useEffect(() => {
    if (!submissionId || deviceMode === 'single_device') return undefined;

    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      if (cancelled) return;
      await loadMultiplayerState();
      if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [deviceMode, loadMultiplayerState, submissionId]);

  // AI Analysis Execution
  const triggerAiEvaluation = useCallback(async (targetSubmission: GameSubmission) => {
    if (aiRequestInProgress.current) return;
    if (!targetSubmission.evidence) {
      setAiError('Không tìm thấy ảnh bằng chứng để AI phân tích. Bạn có thể chuyển sang chế độ đánh giá nhóm.');
      setAiState('error');
      return;
    }

    aiRequestInProgress.current = true;
    setAiState('analyzing');
    setAiError(null);
    sound.playClick();

    try {
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence: targetSubmission.evidence,
          cardTitle: targetSubmission.cardTitle,
          cardCode: targetSubmission.cardCode,
          mission: targetSubmission.mission,
          theme: theme?.name || 'Party Challenge',
          difficulty: activeCard?.difficulty || 2,
          xp: activeCard?.xp || 20,
          submissionId: targetSubmission.id,
          playerId: currentPlayerId,
        }),
      };
      const res = deviceMode === 'multi_device'
        ? await playerApiRequest<AIResponse>(roomPlayerToken, '/api/ai/verify', requestOptions)
        : await apiRequest<AIResponse>('/api/ai/verify', requestOptions);

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể nhận diện ảnh qua AI.');
      }

      const result = res.data;
      setAiResult(result);
      setAiState('completed');

      if (deviceMode === 'single_device') {
        resolveLocalAiSubmission(targetSubmission.id, result.passed, result.scoreBreakdown);
      } else {
        void loadMultiplayerState();
      }

      if (result.passed) {
        sound.playSuccess();
      } else {
        sound.playFailure();
      }
    } catch (evalError) {
      console.error('[AIVerifyPage] AI Verification Error:', evalError);
      setAiError(evalError instanceof Error ? evalError.message : 'Lỗi kết nối máy chủ AI.');
      setAiState('error');
      sound.playFailure();
    } finally {
      aiRequestInProgress.current = false;
    }
  }, [activeCard, currentPlayerId, deviceMode, loadMultiplayerState, resolveLocalAiSubmission, roomPlayerToken, theme]);

  // Reset the one-shot guard when the route points to a different submission.
  // React Router may reuse this page between turns, especially on single-device play.
  useEffect(() => {
    hasTriggeredAi.current = false;
    aiRequestInProgress.current = false;
    setAiResult(null);
    setAiError(null);
    setAiState('idle');
  }, [submissionId]);

  // Auto trigger AI evaluation once the current submission is loaded.
  useEffect(() => {
    if (verificationMethod !== 'ai' || !submission || hasTriggeredAi.current) return;
    let timer: number | undefined;
    if (submission.status === 'pending') {
      hasTriggeredAi.current = true;
      timer = window.setTimeout(() => { void triggerAiEvaluation(submission); }, 0);
    } else if (aiState === 'idle') {
      timer = window.setTimeout(() => setAiState('completed'), 0);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [verificationMethod, submission, triggerAiEvaluation, aiState]);

  const submitVote = async (score: number) => {
    if (!submission || !activeVoterId || submittingVoteRef.current) return;
    submittingVoteRef.current = true;
    setSubmittingVote(true);
    setError(null);
    sound.playClick();
    try {
      let updated: GameSubmission;
      if (deviceMode === 'single_device') {
        const result = castLocalVote(submission.id, activeVoterId, score);
        if (!result) throw new Error('Không tìm thấy lượt gửi thử thách.');
        updated = result;
      } else {
        const response = await playerApiRequest<SubmissionResponse>(
          roomPlayerToken,
          `/api/rooms/submissions/${encodeURIComponent(submission.id)}/votes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: activeVoterId, score }),
          }
        );
        if (!response.data) throw new Error('Máy chủ không trả về trạng thái bình chọn.');
        updated = asGameSubmission(response.data);
      }
      if (deviceMode === 'multi_device') setRemoteSubmission(updated);
      setSelectedGroupScore(80);
      if (updated.status !== 'pending') sound.playSuccess();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Không thể gửi phiếu bầu.');
      if (deviceMode === 'multi_device') void loadMultiplayerState();
    } finally {
      submittingVoteRef.current = false;
      setSubmittingVote(false);
    }
  };

  const finishResult = () => {
    if (!submission) return;

    // Tính percentage thực tế do AI chấm
    const rawPercentage = typeof aiResult?.matchPercentage === 'number'
      ? aiResult.matchPercentage
      : typeof aiResult?.score === 'number' && aiResult.score > 0
        ? aiResult.score
        : (aiResult?.passed ? 85 : 26);
    const matchPercentage = Math.max(0, Math.min(100, Math.round(rawPercentage)));

    // Ngưỡng phân định: >= 50% là ĐẠT, < 50% là KHÔNG ĐẠT
    const isAiApproved = aiResult ? matchPercentage >= 50 : false;
    const passed = verificationMethod === 'ai'
      ? isAiApproved
      : (submission.status === 'approved' || isAiApproved);

    const score = submission.scoreBreakdown.total > 0
      ? submission.scoreBreakdown.total
      : (passed ? (aiResult?.scoreBreakdown?.total ?? 0) : 0);

    navigate(`/result?round=${submission.round}&passed=${passed}&score=${score}&matchPercentage=${matchPercentage}`, {
      replace: true,
      state: {
        round: submission.round,
        passed,
        score,
        groupScore: submission.groupScore,
        playerId: submission.playerId,
        evidence: submission.evidence,
        matchPercentage,
        scoreBreakdown: submission.scoreBreakdown.total > 0
          ? submission.scoreBreakdown
          : aiResult?.scoreBreakdown,
        aiFeedback: aiResult?.feedback,
      },
    });
  };

  const submitter = players.find((player) => player.id === submission?.playerId);
  const voter = deviceMode === 'single_device'
    ? nextLocalVoter
    : players.find((player) => player.id === currentPlayerId);
  const votesCast = submission?.voteCount ?? submission?.votes.length ?? 0;
  const eligibleCount = submission?.eligibleVoterIds.length ?? 0;

  return (
    <main className={`min-h-screen px-4 py-6 transition-colors duration-300 sm:px-6 sm:py-8 ${
      isLight
        ? 'text-slate-900'
        : 'bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.35),_transparent_45%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100'
    }`}>
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col justify-center">
        {/* Navigation Bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
              isLight
                ? 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <ArrowLeft size={18} /> Quay lại
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              verificationMethod === 'ai'
                ? isLight ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-cyan-500/30 bg-cyan-950/60 text-cyan-300'
                : isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/30 bg-amber-950/60 text-amber-300'
            }`}>
              {verificationMethod === 'ai' ? (
                <>
                  <Bot size={14} className="text-cyan-500 animate-pulse" />
                  <span>CHẾ ĐỘ AI JUDGE</span>
                </>
              ) : (
                <>
                  <Users size={14} className="text-amber-500" />
                  <span>BÌNH CHỌN NHÓM</span>
                </>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-5 rounded-[2rem] border p-5 shadow-2xl backdrop-blur-xl sm:p-8 ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/10'
              : 'border-cyan-500/30 bg-slate-900/80 text-white'
          }`}
        >
          {/* Header */}
          <header>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
              {verificationMethod === 'ai' ? 'Trọng Tài AI Độc Lập · Multimodal Vision' : 'Xác thực nhóm · Đánh giá công tâm'}
            </p>
            <h1 className={`mt-1 text-2xl font-black sm:text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {verificationMethod === 'ai' ? 'AI Chấm Điểm Thử Thách' : 'Cùng Đánh Giá Thử Thách'}
            </h1>
            <p className={`mt-1.5 text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {verificationMethod === 'ai'
                ? 'AI Chếck đánh giá ảnh theo thử thách.'
                : 'Chấm điểm từ 0 đến 100. Người gửi không tự chấm bài của mình.'}
            </p>
          </header>

          {loading && (
            <div className={`flex items-center gap-3 rounded-2xl p-4 text-sm ${
              isLight ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-white/5 text-cyan-200'
            }`}>
              <LoaderCircle className="animate-spin" /> Đang tải dữ liệu lượt gửi…
            </div>
          )}

          {error && (
            <p role="alert" className={`rounded-xl border p-3 text-sm ${
              isLight ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-red-400/40 bg-red-500/10 text-red-200'
            }`}>
              {error}
            </p>
          )}

          {submission && (
            <>
              {/* Challenge Information */}
              <article className={`space-y-3 rounded-2xl border p-3 sm:p-4 ${
                isLight ? 'border-slate-200 bg-slate-50/80 text-slate-900' : 'border-white/10 bg-slate-950/60 text-white'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      isLight ? 'bg-sky-100 text-sky-800' : 'bg-fuchsia-500/20 text-fuchsia-300'
                    }`}>
                      VÒNG {submission.round}
                    </span>
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Người chơi: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{submitter?.name ?? 'Bạn'}</strong>
                    </span>
                  </div>
                  <h2 className={`mt-2 text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{submission.cardTitle}</h2>
                  <p className={`mt-2 text-xs leading-5 sm:text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{submission.mission}</p>
                </div>

                {/* Evidence Photo Viewport with Futuristic AI Scanner Line */}
                <div className="relative h-[55vh] min-h-[280px] max-h-[640px] w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-black">
                  {submission.evidence ? (
                    <div className="group relative h-full w-full">
                      <EvidenceImage
                        key={submission.evidence}
                        src={submission.evidence}
                        onOpen={() => setIsImageModalOpen(true)}
                      />
                      {/* Hover Overlay Hint to Zoom */}
                      <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 backdrop-blur-md border border-cyan-500/30">
                          <ZoomIn size={13} /> Nhấn để phóng to
                        </span>
                        <span className="rounded-full bg-cyan-500/20 p-1.5 text-cyan-300 backdrop-blur-md">
                          <Maximize2 size={13} />
                        </span>
                      </div>

                      {/* Laser Scanner Animation when AI is analyzing */}
                      {verificationMethod === 'ai' && aiState === 'analyzing' && (
                        <>
                          <motion.div
                            className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-cyan-500/10 backdrop-contrast-125" />
                        </>
                      )}
                      {/* Tech HUD Corner Brackets */}
                      <div className="pointer-events-none absolute top-1.5 left-1.5 h-3 w-3 border-t-2 border-l-2 border-cyan-400" />
                      <div className="pointer-events-none absolute top-1.5 right-1.5 h-3 w-3 border-t-2 border-r-2 border-cyan-400" />
                      <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-cyan-400" />
                      <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-cyan-400" />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center p-3 text-center text-xs text-slate-400 sm:h-full">
                      Không có ảnh bằng chứng
                    </div>
                  )}
                </div>
              </article>

              {/* ========================================================= */}
              {/* CHẾ ĐỘ 1: XÁC THỰC AI (AI VERIFY MODE)                     */}
              {/* ========================================================= */}
              {verificationMethod === 'ai' && (
                <div className="space-y-4">
                  {/* Status 1: AI is Analyzing */}
                  {aiState === 'analyzing' && (
                    <div className={`rounded-2xl border p-5 text-center ${
                      isLight ? 'border-sky-200 bg-sky-50/80 shadow-md text-slate-800' : 'border-cyan-500/30 bg-cyan-950/40 text-white'
                    }`}>
                      <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <Bot size={32} className={`${isLight ? 'text-sky-600' : 'text-cyan-300'} animate-bounce`} />
                      </div>
                      <h3 className={`mt-3 text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Thần Gió Đang Soi Ảnh...</h3>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={tipIndex}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`mt-2 text-xs font-semibold sm:text-sm ${isLight ? 'text-sky-800' : 'text-cyan-200'}`}
                        >
                          {AI_SCANNING_TIPS[tipIndex]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Status 2: AI Evaluation Completed */}
                  {aiState === 'completed' && aiResult && (() => {
                    // Trích xuất % thực tế do AI chấm (ví dụ 85%, 26%, 73%...)
                    const rawScore = typeof aiResult.matchPercentage === 'number'
                      ? aiResult.matchPercentage
                      : typeof aiResult.score === 'number' && aiResult.score > 0
                        ? aiResult.score
                        : (aiResult.passed ? 85 : 26);
                    const percentage = Math.max(0, Math.min(100, Math.round(rawScore)));

                    // Ngưỡng validate: >= 50% là ĐẠT, < 50% là KHÔNG ĐẠT
                    const isPass = percentage >= 50;

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`space-y-4 rounded-2xl border p-5 ${
                          isPass
                            ? isLight ? 'border-emerald-200 bg-emerald-50/90 text-slate-900 shadow-lg' : 'border-emerald-500/40 bg-emerald-950/30'
                            : isLight ? 'border-rose-200 bg-rose-50/90 text-slate-900 shadow-lg' : 'border-rose-500/40 bg-rose-950/30'
                        }`}
                      >
                        {/* Top Result Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                              isPass
                                ? isLight ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                                : isLight ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-rose-400/40 bg-rose-500/20 text-rose-300'
                            }`}>
                              {isPass ? <CheckCircle2 size={28} /> : <ShieldX size={28} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  KẾT QUẢ TỪ AI JUDGE
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${
                                    isPass
                                      ? isLight ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-emerald-400/50 bg-emerald-500/25 text-emerald-300'
                                      : isLight ? 'border-rose-300 bg-rose-100 text-rose-800' : 'border-rose-400/50 bg-rose-500/25 text-rose-300'
                                  }`}
                                >
                                  {isPass ? `ĐẠT (${percentage}%)` : `KHÔNG ĐẠT (${percentage}%)`}
                                </span>
                              </div>
                              <h3 className={`mt-1 text-lg font-black sm:text-xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {aiResult.verdict || (isPass ? 'HOÀN THÀNH XUẤT SẮC' : 'CHƯA ĐẠT YÊU CẦU')}
                                <span className={`ml-2 text-base font-extrabold sm:text-lg ${isPass ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}`}>
                                  · {percentage}%
                                </span>
                              </h3>
                            </div>
                          </div>

                          {isPass ? (
                            <div className={`rounded-xl border px-3.5 py-1.5 text-center ${
                              isLight ? 'border-emerald-200 bg-emerald-100/70' : 'border-emerald-400/30 bg-emerald-500/20'
                            }`}>
                              <span className={`text-[10px] font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>TỔNG ĐIỂM</span>
                              <p className={`text-xl font-black ${isLight ? 'text-emerald-900' : 'text-white'}`}>+{aiResult.scoreBreakdown.total} XP</p>
                            </div>
                          ) : (
                            <div className={`rounded-xl border px-3.5 py-1.5 text-center ${
                              isLight ? 'border-rose-200 bg-rose-100/70' : 'border-rose-400/30 bg-rose-500/20'
                            }`}>
                              <span className={`text-[10px] font-bold ${isLight ? 'text-rose-800' : 'text-rose-300'}`}>TỔNG ĐIỂM</span>
                              <p className={`text-lg font-black ${isLight ? 'text-rose-900' : 'text-rose-200'}`}>0 XP</p>
                            </div>
                          )}
                        </div>

                        {/* Thanh đo % hoàn thành (AI Match Meter với mốc chuẩn 50%) */}
                        <div className={`rounded-xl border p-3.5 space-y-2.5 ${
                          isLight ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-white/10 bg-slate-950/70'
                        }`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              <Sparkles size={14} className={isPass ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')} />
                              Mức độ hoàn thành thử thách:
                            </span>
                            <span className={`font-black text-sm ${isPass ? (isLight ? 'text-emerald-700' : 'text-emerald-300') : (isLight ? 'text-rose-700' : 'text-rose-300')}`}>
                              {percentage}% {isPass ? '(Vượt chuẩn)' : '(Dưới chuẩn)'}
                            </span>
                          </div>

                          {/* Progress Bar with 50% Threshold Marker */}
                          <div className={`relative h-3.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                isPass
                                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                                  : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                              }`}
                            />
                            {/* 50% Threshold Marker Line */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                              style={{ left: '50%' }}
                              title="Ngưỡng đạt: 50%"
                            />
                          </div>

                          <div className={`flex items-center justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span>0%</span>
                            <span className={`font-bold px-2 py-0.5 rounded-full border ${
                              isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                            }`}>
                              Ngưỡng đạt: ≥ 50%
                            </span>
                            <span>100%</span>
                          </div>

                          <p className={`text-xs leading-relaxed pt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            {isPass
                              ? `✓ AI chấm đạt ${percentage}%. Bức ảnh đáp ứng tốt tinh thần và chi tiết nhiệm vụ (vượt ngưỡng yêu cầu 50%).`
                              : `✗ AI chấm chỉ đạt ${percentage}%. Bức ảnh thiếu các yếu tố cốt lõi hoặc có nhiều biến số chưa đáp ứng (yêu cầu từ 50% trở lên).`}
                          </p>
                        </div>

                        {/* Score Breakdown Pills */}
                        {isPass && (
                          <div className={`grid grid-cols-3 gap-2 rounded-xl p-2.5 text-center text-xs ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950/60'
                          }`}>
                            <div>
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Điểm gốc</span>
                              <p className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>+{aiResult.scoreBreakdown.basePoints} XP</p>
                            </div>
                            <div>
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Ảnh chụp</span>
                              <p className={`font-bold ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>+{aiResult.scoreBreakdown.photoBonus} XP</p>
                            </div>
                            <div>
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Sáng tạo</span>
                              <p className={`font-bold ${isLight ? 'text-emerald-700' : 'text-fuchsia-300'}`}>+{aiResult.scoreBreakdown.creativityBonus} XP</p>
                            </div>
                          </div>
                        )}

                        {/* AI Feedback Bubble */}
                        <div className={`rounded-xl border p-3.5 ${
                          isLight ? 'border-sky-200 bg-sky-50/70 text-slate-800' : 'border-white/10 bg-slate-900/90'
                        }`}>
                          <div className={`flex items-center gap-2 text-xs font-bold ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                            <Bot size={15} /> Lời nhận xét của AI:
                          </div>
                          <p className={`mt-1 text-xs italic leading-relaxed sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            "{aiResult.feedback}"
                          </p>
                        </div>

                        {/* Detected Elements Pills */}
                        {aiResult.detectedElements && aiResult.detectedElements.length > 0 && (
                          <div>
                            <p className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Chi tiết nhận diện được trong ảnh:</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {aiResult.detectedElements.map((elem, i) => (
                                <span
                                  key={i}
                                  className={`flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${
                                    isLight ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-cyan-500/20 bg-cyan-950/40 text-cyan-200'
                                  }`}
                                >
                                  <Tag size={10} /> {elem}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-2">
                          <button
                            onClick={finishResult}
                            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-black shadow-lg transition hover:brightness-110 active:scale-98 ${
                              isLight
                                ? 'btn-blue-gradient text-white shadow-sky-500/20'
                                : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/25'
                            }`}
                          >
                            <Zap size={18} /> Xem Kết Quả Vòng Này
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Status 3: AI Error / Retry */}
                  {aiState === 'error' && (
                    <div className={`space-y-3.5 rounded-2xl border p-4 text-center ${
                      isLight ? 'border-rose-200 bg-rose-50/90 text-slate-800' : 'border-rose-500/40 bg-rose-950/40'
                    }`}>
                      <AlertTriangle className="mx-auto text-rose-500" size={30} />
                      <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Chưa thể hoàn tất chấm điểm AI</h3>
                      <div className={`whitespace-pre-line text-xs leading-relaxed ${isLight ? 'text-rose-800' : 'text-rose-200'}`}>
                        {aiError}
                      </div>

                      {Boolean(aiError?.includes('console.developers.google.com') || aiError?.includes('BẬT')) && (
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <a
                            href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=489886710201"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
                          >
                            <Sparkles size={14} /> Mở Google Cloud để Bật Gemini API (1 Click)
                          </a>
                          <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Sau khi bấm Bật (Enable), đợi khoảng 30s rồi bấm nút "Thử lại phân tích AI" bên dưới.
                          </span>
                        </div>
                      )}

                      <div className="grid gap-2 pt-2 sm:grid-cols-2">
                        <button
                          onClick={() => { void triggerAiEvaluation(submission); }}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition active:scale-98 ${
                            isLight ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          <RefreshCw size={14} /> Thử lại phân tích AI
                        </button>
                        <button
                          onClick={() => { setVerificationMethod('group'); }}
                          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-98 ${
                            isLight ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                          }`}
                        >
                          <Users size={14} /> Đổi sang Bỏ phiếu nhóm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {verificationMethod === 'group' && (
                <>
                  {submission.status === 'pending' && (
                    <div className={`rounded-2xl border p-4 ${
                      isLight ? 'border-slate-200 bg-white/90 shadow-sm text-slate-800' : 'border-cyan-500/25 bg-cyan-500/5'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Đang chờ nhóm đánh giá</h3>
                        <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>Đã bỏ phiếu: {votesCast} / {eligibleCount}</span>
                      </div>
                      <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Điểm nhóm là trung bình các phiếu. Cần ít nhất {submission.requiredVotes} đánh giá đạt 50 điểm để duyệt.
                      </p>
                      {deviceMode === 'single_device' && voter && (
                        <p className={`mt-3 rounded-xl p-3 text-sm font-bold ${
                          isLight ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-slate-950/70 text-amber-200'
                        }`}>
                          Chuyển thiết bị cho {voter.name}. Phiếu của người chơi trước được ẩn.
                        </p>
                      )}
                      {submission.playerId === currentPlayerId && deviceMode === 'multi_device' && (
                        <p className={`mt-3 rounded-xl p-3 text-sm ${
                          isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950/70 text-slate-200'
                        }`}>
                          Bạn đã gửi thử thách này. Đang chờ người chơi khác đánh giá trên thiết bị của họ.
                        </p>
                      )}
                      {deviceMode === 'multi_device' && submission.hasVoted && submission.playerId !== currentPlayerId && (
                        <p className={`mt-3 rounded-xl p-3 text-sm ${
                          isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950/70 text-slate-200'
                        }`}>
                          Bạn đã gửi điểm. Đang chờ những người đánh giá còn lại.
                        </p>
                      )}
                      {Boolean(
                        submission
                        && activeVoterId
                        && submission.status === 'pending'
                        && submission.playerId !== activeVoterId
                        && submission.eligibleVoterIds.includes(activeVoterId)
                        && !submission.hasVoted
                        && !submission.votes.some((v) => v.playerId === activeVoterId)
                      ) && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <label htmlFor="group-score" className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Điểm đánh giá</label>
                            <output htmlFor="group-score" className={`min-w-16 rounded-xl px-3 py-1 text-center text-xl font-black ${
                              isLight ? 'bg-sky-600 text-white' : 'bg-cyan-400 text-slate-950'
                            }`}>
                              {selectedGroupScore}
                            </output>
                          </div>
                          <input
                            id="group-score"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={selectedGroupScore}
                            onChange={(event) => setSelectedGroupScore(Number(event.target.value))}
                            className="h-3 w-full cursor-pointer accent-cyan-400"
                            aria-label={`Điểm đang chọn: ${selectedGroupScore} trên 100`}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            {[50, 80, 100].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setSelectedGroupScore(score)}
                                aria-pressed={selectedGroupScore === score}
                                className={`min-h-11 rounded-xl border px-3 font-bold transition ${
                                  selectedGroupScore === score
                                    ? isLight ? 'border-sky-500 bg-sky-100 text-sky-900 font-bold' : 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                                    : isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/15 bg-white/5 text-slate-200'
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => { void submitVote(selectedGroupScore); }}
                            disabled={submittingVote}
                            className={`min-h-12 w-full rounded-xl px-4 py-3 font-black disabled:opacity-50 transition ${
                              isLight ? 'btn-emerald-gradient text-white shadow-emerald-500/20' : 'bg-cyan-400 text-slate-950'
                            }`}
                          >
                            {submittingVote ? 'Đang gửi điểm…' : 'Xác nhận điểm'}
                          </button>
                        </div>
                      )}
                      {deviceMode === 'single_device' && !voter && (
                        <div className="mt-3 space-y-2">
                          <p className={`text-sm ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                            Không còn người đánh giá hợp lệ trong nhóm (hoặc bạn đang chơi 1 mình).
                          </p>
                          <button
                            onClick={() => { setVerificationMethod('ai'); }}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                              isLight ? 'bg-sky-100 text-sky-800 hover:bg-sky-200' : 'bg-cyan-500/20 text-cyan-200'
                            }`}
                          >
                            <Sparkles size={14} /> Chuyển sang AI Judge tự động chấm
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {submission.status !== 'pending' && (
                    <div className={`rounded-2xl border p-4 ${
                      submission.status === 'approved'
                        ? isLight ? 'border-emerald-200 bg-emerald-50/90 text-slate-800' : 'border-emerald-400/30 bg-emerald-500/10'
                        : isLight ? 'border-rose-200 bg-rose-50/90 text-slate-800' : 'border-rose-400/30 bg-rose-500/10'
                    }`}>
                      <div className={`flex items-center gap-2 font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {submission.status === 'approved' ? <CheckCircle2 className="text-emerald-500" /> : <ShieldX className="text-rose-500" />}
                        {submission.status === 'approved' ? 'Đã được nhóm duyệt' : 'Nhóm đã từ chối thử thách'}
                      </div>
                      <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                        {submission.status === 'approved'
                          ? `XP: ${submission.scoreBreakdown.basePoints} cơ bản + ${submission.scoreBreakdown.photoBonus} ảnh = ${submission.scoreBreakdown.total}.`
                          : 'Thử thách không đạt điều kiện duyệt nhóm.'}
                      </p>
                      {typeof submission.groupScore === 'number' && (
                        <p className={`mt-2 text-sm font-bold ${isLight ? 'text-sky-700' : 'text-cyan-200'}`}>
                          Điểm nhóm trung bình: {Number.isInteger(submission.groupScore) ? submission.groupScore : submission.groupScore.toFixed(1)} / 100
                        </p>
                      )}
                      <button
                        onClick={finishResult}
                        className={`mt-4 min-h-12 w-full rounded-xl px-5 py-3 font-black shadow-lg transition ${
                          isLight ? 'btn-blue-gradient text-white' : 'bg-cyan-500 text-slate-950'
                        }`}
                      >
                        Xem kết quả vòng này
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </motion.div>
      </section>
      {/* Lightbox Modal: Phóng to xem lại ảnh đã chọn */}
      <AnimatePresence>
        {(isImageModalOpen || showPhotoPreview) && submission?.evidence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => {
              setIsImageModalOpen(false);
              setShowPhotoPreview(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/40 bg-slate-950 p-4 shadow-2xl shadow-cyan-500/20 sm:p-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Chi Tiết Ảnh Bằng Chứng Đã Chọn · Vòng {submission.round}
                  </span>
                  <h4 className="text-base font-black text-white sm:text-lg">{submission.cardTitle}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(false);
                    setShowPhotoPreview(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25 active:scale-95"
                  title="Đóng xem ảnh"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/75 p-2">
                <img
                  src={submission.evidence}
                  alt="Ảnh đã chọn phóng to"
                  className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Người thực hiện: <strong className="text-slate-200">{submitter?.name ?? 'Bạn'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(false);
                    setShowPhotoPreview(false);
                  }}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95"
                >
                  Đóng (ESC)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default AIVerifyPage;
