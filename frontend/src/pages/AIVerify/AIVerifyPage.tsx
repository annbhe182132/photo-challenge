import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Bot,
  AlertTriangle,
  RefreshCw,
  Users,
  Zap,
  Tag,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GameSubmission } from '../../context/GameContext';
import { useGame } from '../../context/useGame';
import type { Player } from '../../data/gameData';
import { apiRequest, playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

interface AIAnalysisResult {
  passed: boolean;
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
  } = useGame();

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
  const hasTriggeredAi = useRef(false);

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
    if (!targetSubmission.evidence) {
      setAiError('Không tìm thấy ảnh bằng chứng để AI phân tích. Bạn có thể chuyển sang chế độ đánh giá nhóm.');
      setAiState('error');
      return;
    }

    setAiState('analyzing');
    setAiError(null);
    sound.playClick();

    try {
      const res = await apiRequest<{
        success: boolean;
        data?: AIAnalysisResult;
        message?: string;
      }>('/api/ai/verify', {
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
        }),
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể nhận diện ảnh qua AI.');
      }

      const result = res.data;
      setAiResult(result);
      setAiState('completed');

      if (deviceMode === 'single_device') {
        resolveLocalAiSubmission(targetSubmission.id, result.passed, result.scoreBreakdown, result.feedback);
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
    }
  }, [activeCard?.difficulty, activeCard?.xp, deviceMode, loadMultiplayerState, resolveLocalAiSubmission, theme?.name]);

  // Auto trigger AI evaluation once submission is loaded
  useEffect(() => {
    if (verificationMethod !== 'ai' || !submission || hasTriggeredAi.current) return;
    if (submission.status === 'pending') {
      hasTriggeredAi.current = true;
      void triggerAiEvaluation(submission);
    } else if (aiState === 'idle') {
      setAiState('completed');
    }
  }, [verificationMethod, submission, triggerAiEvaluation, aiState]);

  const submitVote = async (approve: boolean) => {
    if (!submission || !activeVoterId || submittingVote) return;
    setSubmittingVote(true);
    setError(null);
    sound.playClick();
    try {
      let updated: GameSubmission;
      if (deviceMode === 'single_device') {
        const result = castLocalVote(submission.id, activeVoterId, approve);
        if (!result) throw new Error('Không tìm thấy lượt gửi thử thách.');
        updated = result;
      } else {
        const response = await playerApiRequest<SubmissionResponse>(
          roomPlayerToken,
          `/api/rooms/submissions/${encodeURIComponent(submission.id)}/votes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: activeVoterId, approve }),
          }
        );
        if (!response.data) throw new Error('Máy chủ không trả về trạng thái bình chọn.');
        updated = asGameSubmission(response.data);
      }
      if (deviceMode === 'multi_device') setRemoteSubmission(updated);
      if (updated.status !== 'pending') sound.playSuccess();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Không thể gửi phiếu bầu.');
      if (deviceMode === 'multi_device') void loadMultiplayerState();
    } finally {
      setSubmittingVote(false);
    }
  };

  const finishResult = () => {
    if (!submission) return;
    const passed = submission.status === 'approved' || (aiResult?.passed ?? false);
    const score = submission.scoreBreakdown.total > 0
      ? submission.scoreBreakdown.total
      : (aiResult?.scoreBreakdown?.total ?? 0);

    navigate(`/result?round=${submission.round}&passed=${passed}&score=${score}`, {
      replace: true,
      state: {
        round: submission.round,
        passed,
        score,
        playerId: submission.playerId,
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.35),_transparent_45%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col justify-center">
        {/* Navigation Bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft size={18} /> Quay lại
          </button>
          
          <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3.5 py-1.5 text-xs font-bold text-cyan-300">
            {verificationMethod === 'ai' ? (
              <>
                <Bot size={14} className="text-cyan-400 animate-pulse" />
                <span>CHẾ ĐỘ AI JUDGE</span>
              </>
            ) : (
              <>
                <Users size={14} className="text-amber-400" />
                <span>BÌNH CHỌN NHÓM</span>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-[2rem] border border-cyan-500/30 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          {/* Header */}
          <header>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              {verificationMethod === 'ai' ? 'Trọng Tài AI Độc Lập · Multimodal Vision' : 'Xác thực nhóm · Đánh giá công tâm'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {verificationMethod === 'ai' ? 'AI Chấm Điểm Thử Thách' : 'Cùng Đánh Giá Thử Thách'}
            </h1>
            <p className="mt-1.5 text-xs text-slate-300 sm:text-sm">
              {verificationMethod === 'ai'
                ? 'Mô hình AI Gemini tự động phân tích hình ảnh, phát hiện chi tiết và đối chiếu theo tiêu chí thẻ bài.'
                : 'Người gửi không được tự bỏ phiếu. Cần ít nhất 2/3 phiếu hợp lệ để duyệt.'}
            </p>
          </header>

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm text-cyan-200">
              <LoaderCircle className="animate-spin" /> Đang tải dữ liệu lượt gửi…
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {submission && (
            <>
              {/* Challenge Information */}
              <article className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-fuchsia-500/20 px-2 py-0.5 text-[11px] font-bold text-fuchsia-300">
                      VÒNG {submission.round}
                    </span>
                    <span className="text-xs text-slate-400">
                      Người chơi: <strong className="text-slate-200">{submitter?.name ?? 'Bạn'}</strong>
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">{submission.cardTitle}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm">{submission.mission}</p>
                </div>

                {/* Evidence Photo Viewport with Futuristic AI Scanner Line */}
                <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900">
                  {submission.evidence ? (
                    <div className="relative h-44 w-full sm:h-full">
                      <img
                        src={submission.evidence}
                        alt="Bằng chứng thử thách"
                        className="h-full w-full object-cover"
                      />
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
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-5 text-center">
                      <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <Bot size={32} className="text-cyan-300 animate-bounce" />
                      </div>
                      <h3 className="mt-3 text-base font-black text-white">AI Thần Gió Đang Soi Ảnh...</h3>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={tipIndex}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-2 text-xs font-semibold text-cyan-200 sm:text-sm"
                        >
                          {AI_SCANNING_TIPS[tipIndex]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Status 2: AI Evaluation Completed */}
                  {aiState === 'completed' && aiResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`space-y-4 rounded-2xl border p-5 ${
                        aiResult.passed
                          ? 'border-emerald-500/40 bg-emerald-950/30'
                          : 'border-rose-500/40 bg-rose-950/30'
                      }`}
                    >
                      {/* Top Result Banner */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {aiResult.passed ? (
                            <CheckCircle2 size={26} className="text-emerald-400" />
                          ) : (
                            <ShieldX size={26} className="text-rose-400" />
                          )}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              KẾT QUẢ TỪ AI JUDGE
                            </span>
                            <h3 className="text-lg font-black text-white sm:text-xl">
                              {aiResult.verdict || (aiResult.passed ? 'HOÀN THÀNH XUẤT SẮC' : 'CHƯA ĐẠT YÊU CẦU')}
                            </h3>
                          </div>
                        </div>

                        {aiResult.passed && (
                          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-1.5 text-center">
                            <span className="text-[10px] font-bold text-emerald-300">TỔNG ĐIỂM</span>
                            <p className="text-xl font-black text-white">+{aiResult.scoreBreakdown.total} XP</p>
                          </div>
                        )}
                      </div>

                      {/* Score Breakdown Pills */}
                      {aiResult.passed && (
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950/60 p-2.5 text-center text-xs">
                          <div>
                            <span className="text-slate-400">Điểm gốc</span>
                            <p className="font-bold text-slate-100">+{aiResult.scoreBreakdown.basePoints} XP</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Ảnh chụp</span>
                            <p className="font-bold text-cyan-300">+{aiResult.scoreBreakdown.photoBonus} XP</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Sáng tạo</span>
                            <p className="font-bold text-fuchsia-300">+{aiResult.scoreBreakdown.creativityBonus} XP</p>
                          </div>
                        </div>
                      )}

                      {/* AI Feedback Bubble */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                          <Bot size={15} /> Lời nhận xét của AI:
                        </div>
                        <p className="mt-1 text-xs italic leading-relaxed text-slate-200 sm:text-sm">
                          "{aiResult.feedback}"
                        </p>
                      </div>

                      {/* Detected Elements Pills */}
                      {aiResult.detectedElements && aiResult.detectedElements.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400">Chi tiết nhận diện được trong ảnh:</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {aiResult.detectedElements.map((elem, i) => (
                              <span
                                key={i}
                                className="flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-950/40 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200"
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
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-98"
                        >
                          <Zap size={18} /> Xem Kết Quả Vòng Này
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Status 3: AI Error / Retry */}
                  {aiState === 'error' && (
                    <div className="space-y-3.5 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-center">
                      <AlertTriangle className="mx-auto text-rose-400" size={30} />
                      <h3 className="text-sm font-bold text-white">Chưa thể hoàn tất chấm điểm AI</h3>
                      <div className="whitespace-pre-line text-xs leading-relaxed text-rose-200">
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
                          <span className="text-[11px] text-slate-300">
                            Sau khi bấm Bật (Enable), đợi khoảng 30s rồi bấm nút "Thử lại phân tích AI" bên dưới.
                          </span>
                        </div>
                      )}

                      <div className="grid gap-2 pt-2 sm:grid-cols-2">
                        <button
                          onClick={() => { void triggerAiEvaluation(submission); }}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 active:scale-98"
                        >
                          <RefreshCw size={14} /> Thử lại phân tích AI
                        </button>
                        <button
                          onClick={() => { setVerificationMethod('group'); }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-98"
                        >
                          <Users size={14} /> Đổi sang Bỏ phiếu nhóm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* CHẾ ĐỘ 2: BỎ PHIẾU NHÓM (GROUP VOTE MODE)                  */}
              {/* ========================================================= */}
              {verificationMethod === 'group' && (
                <>
                  {submission.status === 'pending' && (
                    <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-white">Đang chờ nhóm đánh giá</h3>
                        <span className="text-xs text-slate-300">Đã bỏ phiếu: {votesCast} / {eligibleCount}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        Cần {submission.requiredVotes} phiếu đồng ý. Tỷ lệ đồng ý được giữ kín trong lúc bỏ phiếu.
                      </p>
                      {deviceMode === 'single_device' && voter && (
                        <p className="mt-3 rounded-xl bg-slate-950/70 p-3 text-sm font-bold text-amber-200">
                          Chuyển thiết bị cho {voter.name}. Phiếu của người chơi trước được ẩn.
                        </p>
                      )}
                      {submission.playerId === currentPlayerId && deviceMode === 'multi_device' && (
                        <p className="mt-3 rounded-xl bg-slate-950/70 p-3 text-sm text-slate-200">
                          Bạn đã gửi thử thách này. Đang chờ người chơi khác đánh giá trên thiết bị của họ.
                        </p>
                      )}
                      {Boolean(
                        submission
                        && activeVoterId
                        && submission.status === 'pending'
                        && submission.playerId !== activeVoterId
                        && submission.eligibleVoterIds.includes(activeVoterId)
                        && !submission.votes.some((v) => v.playerId === activeVoterId)
                      ) && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <button
                            onClick={() => { void submitVote(true); }}
                            disabled={submittingVote}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 font-bold text-emerald-200 disabled:opacity-50"
                          >
                            <ShieldCheck /> Chấp thuận
                          </button>
                          <button
                            onClick={() => { void submitVote(false); }}
                            disabled={submittingVote}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-500/20 px-4 py-3 font-bold text-rose-200 disabled:opacity-50"
                          >
                            <ShieldX /> Từ chối
                          </button>
                        </div>
                      )}
                      {deviceMode === 'single_device' && !voter && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-amber-200">
                            Không còn người đánh giá hợp lệ trong nhóm (hoặc bạn đang chơi 1 mình).
                          </p>
                          <button
                            onClick={() => { setVerificationMethod('ai'); }}
                            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200"
                          >
                            <Sparkles size={14} /> Chuyển sang AI Judge tự động chấm
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {submission.status !== 'pending' && (
                    <div className={`rounded-2xl border p-4 ${submission.status === 'approved' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-400/30 bg-rose-500/10'}`}>
                      <div className="flex items-center gap-2 font-black text-white">
                        {submission.status === 'approved' ? <CheckCircle2 className="text-emerald-300" /> : <ShieldX className="text-rose-300" />}
                        {submission.status === 'approved' ? 'Đã được nhóm duyệt' : 'Nhóm đã từ chối thử thách'}
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {submission.status === 'approved'
                          ? `Điểm: ${submission.scoreBreakdown.basePoints} cơ bản + ${submission.scoreBreakdown.photoBonus} ảnh = ${submission.scoreBreakdown.total}.`
                          : 'Thử thách bị từ chối khi không đạt ngưỡng hai phần ba phiếu đồng ý.'}
                      </p>
                      <button onClick={finishResult} className="mt-4 min-h-12 w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950">
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
    </main>
  );
};

export default AIVerifyPage;
