import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Clock3, HelpCircle, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import type { Player } from '../../data/gameData';
import { apiRequest, playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

interface CurrentRoomResponse {
  success: boolean;
  data?: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex: number;
    activePlayerId: string | null;
    turnStartedAt: string | null;
    turnDeadline: string | null;
    turnDurationSeconds: 0 | 15 | 30 | 60;
    turnHistory?: Array<{
      turnIndex: number;
      round: number;
      playerId: string;
      status: 'completed' | 'failed' | 'timed_out' | 'skipped';
      score: number;
    }>;
  };
}

const getCaptureTimeByDifficulty = (diff: number) => {
  if (diff <= 2) return 10; // Dễ: 10 giây
  if (diff <= 4) return 15; // Trung bình: 15 giây
  return 20; // Khó: 20 giây
};

const getDifficultyLabel = (diff: number) => {
  if (diff <= 2) return { text: 'Dễ (Chụp trong 10s)', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
  if (diff <= 4) return { text: 'Trung Bình (Chụp trong 15s)', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' };
  return { text: 'Khó (Chụp trong 20s)', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
};

const ChallengePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeCard,
    currentRound,
    totalRounds,
    players,
    photoEvidence,
    verificationMethod,
    deviceMode,
    currentPlayerId,
    roomPlayerToken,
    roomCode,
    getCurrentPlayer,
    turnDeadline,
    turnStartedAt,
    currentTurnIndex,
    turnDurationSeconds,
    syncRoom,
    soundEnabled,
    toggleSound,
    startLocalTurn,
  } = useGame();

  const round = location.state?.round ?? currentRound;
  const currentPlayer = getCurrentPlayer(round);
  const isMyTurn = deviceMode === 'single_device' || currentPlayer.id === currentPlayerId;
  const captureTime = getCaptureTimeByDifficulty(activeCard.difficulty);
  const diffLabel = getDifficultyLabel(activeCard.difficulty);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const timeoutRedirectedRef = useRef(false);
  const warnedAtFiveRef = useRef(false);
  const entryTurnIndexRef = useRef(currentTurnIndex);

  const handleStartCamera = () => {
    sound.playClick();
    navigate('/camera', {
      state: { round, captureTime },
    });
  };

  const handleSkipTurn = async () => {
    if (!isMyTurn || skipping) return;
    sound.playClick();
    if (deviceMode === 'single_device') {
      navigate('/result', { state: { round, playerId: currentPlayer.id, passed: false, score: 0, skipped: true } });
      return;
    }
    if (!currentPlayerId) return;
    setSkipping(true);
    setSkipError(null);
    try {
      const response = await playerApiRequest<CurrentRoomResponse>(
        roomPlayerToken,
        `/api/rooms/${encodeURIComponent(roomCode)}/skip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: currentPlayerId, turnIndex: currentTurnIndex }),
        },
      );
      if (!response.success || !response.data) throw new Error('Máy chủ không xác nhận được lượt bỏ qua.');
      syncRoom(response.data);
      navigate('/result', { state: { round, playerId: currentPlayer.id, passed: false, score: 0, skipped: true } });
    } catch (error) {
      setSkipError(error instanceof Error ? error.message : 'Không thể bỏ qua lượt này.');
    } finally {
      setSkipping(false);
    }
  };

  useEffect(() => {
    if (deviceMode === 'single_device' && isMyTurn && !turnStartedAt) startLocalTurn();
  }, [deviceMode, isMyTurn, startLocalTurn, turnStartedAt]);

  useEffect(() => {
    if (deviceMode !== 'multi_device') return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const pollRoom = async () => {
      try {
        const response = await apiRequest<CurrentRoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (cancelled || !response.success || !response.data) return;
        syncRoom(response.data);
        if (response.data.currentTurnIndex !== entryTurnIndexRef.current) {
          const resolvedTurn = response.data.turnHistory?.find((turn) => turn.turnIndex === entryTurnIndexRef.current);
          navigate('/result', {
            replace: true,
            state: {
              round: resolvedTurn?.round ?? round,
              playerId: resolvedTurn?.playerId ?? currentPlayer.id,
              passed: resolvedTurn?.status === 'completed',
              timedOut: resolvedTurn?.status === 'timed_out',
              skipped: resolvedTurn?.status === 'skipped',
              score: resolvedTurn?.score ?? 0,
            },
          });
        } else if (response.data.status === 'completed') {
          navigate('/leaderboard', { replace: true });
        }
      } catch (error) {
        if (!cancelled) console.error('[ChallengePage] Failed to synchronize the active turn:', error);
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void pollRoom(); }, 2000);
      }
    };
    void pollRoom();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [currentPlayer.id, deviceMode, navigate, roomCode, round, syncRoom]);

  useEffect(() => {
    if (!isMyTurn || !turnDeadline) {
      return undefined;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((new Date(turnDeadline).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 5 && !warnedAtFiveRef.current) {
        warnedAtFiveRef.current = true;
        if (soundEnabled) sound.playTick();
      }
      if (remaining > 5) warnedAtFiveRef.current = false;
      if (remaining === 0 && deviceMode === 'single_device' && !timeoutRedirectedRef.current) {
        timeoutRedirectedRef.current = true;
        navigate('/result', { replace: true, state: { round, passed: false, score: 0, timedOut: true } });
      }
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [deviceMode, isMyTurn, navigate, round, soundEnabled, turnDeadline]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/scan');
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
            >
              <ArrowLeft size={18} />
              Quét lại bài
            </button>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-4 py-1.5 text-xs font-bold text-cyan-300">
                VÒNG {round} / {totalRounds || '∞'}
              </span>
            </div>
          </div>

          <div className="my-auto py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6"
            >
              {/* Active Player Indicator Banner */}
              <div className="rounded-2xl border border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-950/70 via-purple-950/70 to-slate-900 p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-12 w-12 rounded-full border-2 border-fuchsia-400 object-cover shadow-md" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400 block">Lượt Thực Hiện Thử Thách Vòng {round}:</span>
                    <h3 className="text-lg font-black text-white">{currentPlayer.name}</h3>
                  </div>
                </div>
                <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-bold text-fuchsia-300">
                  🎯 Điểm Hiện Tại: {currentPlayer.score} XP
                </div>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Điểm cộng dồn người chơi">
                {[...players].sort((a, b) => b.score - a.score).map((player) => (
                  <span key={player.id} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200">
                    {player.name}: <strong className="text-cyan-300">{player.score} XP</strong>
                  </span>
                ))}
              </div>
              {/* Preparation Timer Bar */}
              <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock3 className={`h-6 w-6 ${timeLeft !== null && timeLeft <= 5 ? 'text-red-400' : 'text-cyan-300'}`} />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Thời gian lượt của {currentPlayer.name}</p>
                    <p className="text-xs text-slate-300">
                      Thời gian chụp camera: <span className="font-bold text-cyan-300">{captureTime} giây</span>
                    </p>
                  </div>
                </div>
                <div className={`text-4xl font-black ${timeLeft !== null && timeLeft <= 5 ? 'text-red-400' : 'text-cyan-300'}`}>
                  {timeLeft === null ? '∞' : `${timeLeft}s`}
                </div>
                {timeLeft !== null && turnDurationSeconds > 0 && (
                  <div className="absolute bottom-0 left-0 h-1.5 w-full overflow-hidden rounded-b-2xl bg-white/10">
                    <div
                      className={`h-full transition-[width] duration-300 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-cyan-400'}`}
                      style={{ width: `${Math.max(0, Math.min(100, (timeLeft / turnDurationSeconds) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-pressed={soundEnabled}
                onClick={toggleSound}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                Âm thanh {soundEnabled ? 'bật' : 'tắt'}
              </button>

              {/* Holographic Card View */}
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -5 }}
                className="relative overflow-hidden rounded-[2rem] border-2 border-cyan-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/60 p-8 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-mono text-sm font-bold text-cyan-400">{activeCard.code}</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border ${diffLabel.color}`}>
                      Độ khó: {diffLabel.text}
                    </span>
                    <span className="text-amber-400 font-bold text-sm">{'⭐'.repeat(activeCard.difficulty)}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h2 className="text-2xl font-black text-white sm:text-3xl">{activeCard.title}</h2>
                  <p className="text-lg text-cyan-200 font-semibold leading-relaxed">{activeCard.mission}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {activeCard.tags.map((tag) => (
                      <span key={tag} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Trophy size={18} /> +100 điểm nếu nhóm duyệt
                  </div>
                </div>
              </motion.div>

              {/* Hint Accordion */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowHint(!showHint);
                  }}
                  className="flex w-full items-center justify-between text-xs font-bold text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-cyan-300" /> Xem gợi ý thực hiện
                  </span>
                  <span>{showHint ? '▲ Đóng' : '▼ Mở'}</span>
                </button>
                {showHint && (
                  <p className="mt-3 text-xs text-cyan-200 leading-relaxed border-t border-white/10 pt-3">
                    💡 Hãy làm theo hướng dẫn trên thẻ. {verificationMethod === 'ai' ? '🤖 SNAPDECK AI Judge sẽ quét ảnh và tự động chấm điểm độ sáng tạo & thần thái cho bạn!' : '👥 Các bạn cùng bàn sẽ bình chọn để duyệt thử thách.'}
                    <span className="mt-2 block">Ảnh bằng chứng: {photoEvidence === 'required' ? 'bắt buộc' : photoEvidence === 'optional' ? 'không bắt buộc' : 'đang tắt'}.</span>
                  </p>
                )}
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartCamera}
                disabled={!isMyTurn}
                aria-label="Mở camera thực hiện thử thách"
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 text-lg font-black text-white shadow-2xl shadow-fuchsia-500/30 transition hover:shadow-cyan-500/40"
              >
                <Camera className="h-6 w-6" />
                {!isMyTurn ? `Đang chờ lượt của ${currentPlayer.name}` : `Sẵn Sàng → Mở Camera Chụp Ảnh (${captureTime}s)`}
              </motion.button>
              {isMyTurn && (
                <button
                  type="button"
                  onClick={() => { void handleSkipTurn(); }}
                  disabled={skipping}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                >
                  {skipping ? 'Đang chuyển lượt…' : 'Bỏ qua lượt này · 0 điểm'}
                </button>
              )}
              {skipError && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{skipError}</p>}
              {!isMyTurn && (
                <p className="text-center text-xs text-slate-400">Khi {currentPlayer.name} gửi thử thách, thiết bị của bạn sẽ nhận yêu cầu đánh giá.</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengePage;