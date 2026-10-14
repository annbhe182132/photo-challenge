import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GameSubmission } from '../../context/GameContext';
import { useGame } from '../../context/useGame';
import type { Player } from '../../data/gameData';
import { apiRequest, playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

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
    syncRoom,
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
    if (!submission || submission.status === 'pending') return;
    const passed = submission.status === 'approved';
    const score = submission.scoreBreakdown.total;
    navigate(`/result?round=${submission.round}&passed=${passed}&score=${score}`, {
      replace: true,
      state: {
        round: submission.round,
        passed,
        score,
        playerId: submission.playerId,
        scoreBreakdown: submission.scoreBreakdown,
      },
    });
  };

  const voterAlreadyVoted = Boolean(
    activeVoterId && (
      submission?.hasVoted
      || submission?.votes.some((vote) => vote.playerId === activeVoterId)
    )
  );
  const canCurrentPlayerVote = Boolean(
    submission
    && activeVoterId
    && submission.status === 'pending'
    && submission.playerId !== activeVoterId
    && submission.eligibleVoterIds.includes(activeVoterId)
    && !voterAlreadyVoted
  );
  const submitter = players.find((player) => player.id === submission?.playerId);
  const voter = deviceMode === 'single_device'
    ? nextLocalVoter
    : players.find((player) => player.id === currentPlayerId);
  const votesCast = submission?.voteCount ?? submission?.votes.length ?? 0;
  const eligibleCount = submission?.eligibleVoterIds.length ?? 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col justify-center">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-[2rem] border border-cyan-500/30 bg-slate-900/75 p-5 shadow-2xl sm:p-8"
        >
          <header>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Xác thực nhóm · Không có quyền duyệt của host</p>
            <h1 className="mt-2 text-3xl font-black text-white">Cùng đánh giá thử thách</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Người gửi không được tự bỏ phiếu. Cần ít nhất hai phần ba phiếu hợp lệ để duyệt; mỗi người chỉ bỏ một phiếu.
            </p>
          </header>

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm text-cyan-200">
              <LoaderCircle className="animate-spin" /> Đang đồng bộ kết quả và phiếu bầu…
            </div>
          )}
          {(error || (deviceMode === 'single_device' && !submission && submissionId && !loading
            ? 'Không tìm thấy lượt gửi đã lưu trên thiết bị này.'
            : null)) && (
            <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error || 'Không tìm thấy lượt gửi đã lưu trên thiết bị này.'}
            </p>
          )}

          {submission && (
            <>
              <article className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <p className="text-xs font-bold uppercase text-fuchsia-300">
                    Gửi bởi {submitter?.name ?? 'Người chơi'} · Vòng {submission.round}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{submission.cardTitle}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">{submission.mission}</p>
                </div>
                {submission.evidence && (
                  <img src={submission.evidence} alt="Ảnh bằng chứng gửi cho nhóm" className="max-h-56 w-full rounded-xl object-cover sm:h-40" />
                )}
                {!submission.evidence && (
                  <div className="flex min-h-24 items-center justify-center rounded-xl border border-white/10 text-xs text-slate-400">Không gửi ảnh bằng chứng</div>
                )}
              </article>

              {submission.status === 'pending' && (
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-white">Đang chờ đánh giá</h3>
                    <span className="text-xs text-slate-300">Đã bỏ phiếu: {votesCast} / {eligibleCount}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Cần {submission.requiredVotes} phiếu đồng ý. Tỷ lệ đồng ý chưa được tiết lộ trong lúc bỏ phiếu.
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
                  {canCurrentPlayerVote && (
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
                    <p className="mt-3 text-sm text-amber-200">Không còn người đánh giá hợp lệ. Ván một người không được tự duyệt.</p>
                  )}
                  {deviceMode === 'multi_device' && !canCurrentPlayerVote && submission.playerId !== currentPlayerId && (
                    <p className="mt-3 text-xs text-slate-400">Thiết bị này không có phiếu hợp lệ còn lại. Kết quả sẽ đồng bộ khi người chơi khác bỏ phiếu.</p>
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
                      : 'Thử thách bị từ chối khi không thể đạt ngưỡng hai phần ba. Không trừ điểm.'}
                  </p>
                  <button onClick={finishResult} className="mt-4 min-h-12 w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950">
                    Xem kết quả vòng này
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </section>
    </main>
  );
};

export default AIVerifyPage;
