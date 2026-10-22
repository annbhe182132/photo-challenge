import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Flame,
  HeartHandshake,
  Maximize2,
  PenTool,
  ShieldAlert,
  Sparkles,
  Trophy,
  X,
  ZoomIn,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import { PUNISHMENTS, type Punishment } from '../../data/gameData';
import type { Player } from '../../data/gameData';
import { playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';
import ThemeToggle from '../../components/ThemeToggle';

interface RoomAdvanceResponse {
  success: boolean;
  data?: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
  };
}

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentRound,
    getCurrentPlayer,
    totalRounds,
    mode,
    deviceMode,
    roomCode,
    currentPlayerId,
    roomPlayerToken,
    players,
    currentTurnIndex,
    activePlayerId,
    gameStatus,
    advanceLocalTurn,
    syncRoom,
    themeMode,
  } = useGame();

  const isLight = themeMode === 'light';

  const query = new URLSearchParams(location.search);
  const round = location.state?.round ?? (Number(query.get('round')) || currentRound);
  const resultPlayerId = location.state?.playerId ?? query.get('playerId');
  const currentPlayer = players.find((player) => player.id === resultPlayerId) ?? getCurrentPlayer(round);
  const passed = location.state?.passed ?? query.get('passed') === 'true';
  const timedOut = location.state?.timedOut === true || query.get('timedOut') === 'true';
  const skipped = location.state?.skipped === true || query.get('skipped') === 'true';
  const score = location.state?.score ?? (Number(query.get('score')) || 0);
  const evidence = (location.state?.evidence as string | undefined) ?? null;
  const rawMatchPercentage = location.state?.matchPercentage ?? query.get('matchPercentage');
  const matchPercentage = rawMatchPercentage !== null && rawMatchPercentage !== undefined && !Number.isNaN(Number(rawMatchPercentage))
    ? Math.max(0, Math.min(100, Math.round(Number(rawMatchPercentage))))
    : undefined;
  const groupScore = location.state?.groupScore as number | undefined;
  const scoreBreakdown = location.state?.scoreBreakdown as {
    basePoints: number;
    photoBonus: number;
    creativityBonus: number;
    total: number;
  } | undefined;
  const aiFeedback = location.state?.aiFeedback as string | undefined;

  // Image zoom modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  // Penalty Section States
  const [penaltyMode, setPenaltyMode] = useState<'random' | 'custom'>('random');
  const [spinning, setSpinning] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<Punishment | null>(null);
  const [customPenaltyTitle, setCustomPenaltyTitle] = useState('');
  const [customPenaltyDesc, setCustomPenaltyDesc] = useState('');
  const [customApplied, setCustomApplied] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [showFinalSummary, setShowFinalSummary] = useState(false);

  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setCustomApplied(false);
    let count = 0;
    const spinTimer = setInterval(() => {
      sound.playSpinTick();
      count++;
      if (count > 20) {
        clearInterval(spinTimer);
        const randomPunishment = PUNISHMENTS[Math.floor(Math.random() * PUNISHMENTS.length)];
        setSelectedPunishment(randomPunishment);
        setSpinning(false);
        sound.playSuccess();
      }
    }, 100);
  };

  const handleSelectPredefined = (p: Punishment) => {
    sound.playClick();
    setSelectedPunishment(p);
    setCustomApplied(true);
  };

  const handleApplyCustomInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPenaltyTitle.trim()) return;
    sound.playSuccess();
    const customP: Punishment = {
      id: `custom-${Date.now()}`,
      title: customPenaltyTitle.trim(),
      description: customPenaltyDesc.trim() || 'Hình phạt do nhóm tự sáng tạo dành cho người thua lượt này!',
      icon: '🎨',
    };
    setSelectedPunishment(customP);
    setCustomApplied(true);
  };

  const handleNextRound = async () => {
    if (advancing) return;
    sound.playClick();
    if (showRoundSummary) {
      if (showFinalSummary) navigate('/leaderboard');
      else navigate(deviceMode === 'multi_device' && activePlayerId !== currentPlayerId ? '/challenge' : '/scan', { state: { round: currentRound } });
      return;
    }
    setAdvancing(true);
    setProgressError(null);
    try {
      if (deviceMode === 'multi_device') {
        if (!currentPlayerId) throw new Error('Không xác định được người chơi trong phòng.');
        const response = await playerApiRequest<RoomAdvanceResponse>(
          roomPlayerToken,
          `/api/rooms/${encodeURIComponent(roomCode)}/advance`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: currentPlayerId, round }),
          }
        );
        if (!response.success || !response.data) throw new Error('Máy chủ không đồng bộ được vòng tiếp theo.');
        syncRoom(response.data);
        if (response.data.status === 'completed') {
          setShowRoundSummary(true);
          setShowFinalSummary(true);
          return;
        }
        if (response.data.currentRound > round) {
          setShowRoundSummary(true);
          return;
        }
      } else {
        const transition = advanceLocalTurn(timedOut ? 'timed_out' : skipped ? 'skipped' : passed ? 'completed' : 'failed');
        if (transition.completed) {
          setShowRoundSummary(true);
          setShowFinalSummary(true);
          return;
        }
        if (transition.roundChanged) {
          setShowRoundSummary(true);
          return;
        }
      }
      navigate(deviceMode === 'multi_device' && activePlayerId !== currentPlayerId ? '/challenge' : '/scan', { state: { round: currentRound } });
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : 'Không thể tiến sang vòng tiếp theo.');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isLight
        ? 'text-slate-900'
        : 'bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100'
    }`}>
      <div className="relative isolate min-h-screen overflow-hidden">
        {/* Ambient Glow in Dark Mode */}
        {!isLight && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className={`absolute left-1/4 top-10 h-72 w-72 rounded-full blur-3xl ${passed ? 'bg-cyan-500/20' : 'bg-red-500/25'}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className={`absolute right-1/4 bottom-10 h-72 w-72 rounded-full blur-3xl ${passed ? 'bg-fuchsia-500/20' : 'bg-orange-500/25'}`}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>
        )}

        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>

          <div className="my-auto py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-[2.5rem] border p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6 text-center ${
                isLight
                  ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/10'
                  : 'border-cyan-500/30 bg-slate-900/60 text-white'
              }`}
            >
              {/* Active Player Card Badge */}
              <div className={`mx-auto flex w-fit items-center gap-2.5 rounded-full border px-5 py-2 text-xs font-bold backdrop-blur-xl shadow-lg ${
                isLight
                  ? 'border-sky-300 bg-sky-50 text-sky-800'
                  : 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-300'
              }`}>
                <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-6 w-6 rounded-full object-cover border border-sky-400" />
                <span>Lượt chơi của: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentPlayer.name}</strong></span>
              </div>

              {/* Icon Header */}
              {passed ? (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 via-emerald-500 to-amber-300 p-1 shadow-lg">
                  <div className={`flex h-full w-full items-center justify-center rounded-full ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                    <Trophy className="h-10 w-10 text-amber-500 animate-bounce" />
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-red-500 via-orange-500 to-amber-500 p-1 shadow-lg">
                  <div className={`flex h-full w-full items-center justify-center rounded-full ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                    <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
                  </div>
                </div>
              )}

              <div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${
                    passed
                      ? isLight ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                      : isLight ? 'border-red-300 bg-red-50 text-red-700' : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  <Sparkles size={14} /> KẾT QUẢ VÒNG {round} / {totalRounds || '∞'}
                </span>

                <h1 className={`mt-3 text-3xl font-black sm:text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {timedOut
                    ? `${currentPlayer.name} đã hết thời gian`
                    : skipped
                      ? `${currentPlayer.name} đã bỏ qua lượt`
                    : passed
                      ? `${currentPlayer.name} hoàn thành thử thách!${matchPercentage !== undefined ? ` (${matchPercentage}%)` : ''}`
                      : `${currentPlayer.name} chưa đạt thử thách${matchPercentage !== undefined ? ` (${matchPercentage}%)` : ''}`}
                </h1>

                {/* Badge tỷ lệ % cụ thể sau thông báo ĐẠT / KHÔNG ĐẠT */}
                {matchPercentage !== undefined && !timedOut && !skipped && (
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black border shadow-md ${
                        passed
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                          : 'border-rose-400/40 bg-rose-500/20 text-rose-300 shadow-rose-500/10'
                      }`}
                    >
                      {passed ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>ĐẠT: {matchPercentage}% (Vượt ngưỡng ≥ 50%)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={13} className="text-rose-400" />
                          <span>KHÔNG ĐẠT: {matchPercentage}% (Yêu cầu ≥ 50%)</span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  {timedOut || skipped
                    ? 'Lượt này không được cộng điểm hoàn thành.'
                    : passed
                      ? (aiFeedback ? 'Thử thách được AI Judge công nhận xuất sắc!' : 'Kết quả được ghi nhận và tính điểm thành công!')
                      : (aiFeedback ? 'Thử thách chưa đạt yêu cầu từ AI Judge.' : 'Thử thách chưa thể hoàn thành ở vòng này.')}
                </p>

                {/* Thumbnail ảnh bằng chứng đã chọn/chụp với nút phóng to */}
                {evidence && (
                  <div className={`mx-auto mt-4 max-w-xs overflow-hidden rounded-2xl border p-2 shadow-xl ${
                    isLight ? 'border-sky-200 bg-white shadow-sky-950/5' : 'border-cyan-500/30 bg-slate-950/80'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="group relative block h-40 w-full cursor-zoom-in overflow-hidden rounded-xl focus:outline-none"
                      title="Nhấn để phóng to xem lại ảnh đã chọn"
                    >
                      <img
                        src={evidence}
                        alt="Bằng chứng thử thách"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-transparent to-transparent p-2.5 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] font-bold text-cyan-300 backdrop-blur-md border border-cyan-500/30">
                          <ZoomIn size={12} /> Xem lại ảnh
                        </span>
                        <span className="rounded-full bg-cyan-500/20 p-1.5 text-cyan-300 backdrop-blur-md">
                          <Maximize2 size={12} />
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                {aiFeedback && (
                  <div className={`mt-3 rounded-2xl border p-4 text-left shadow-lg ${
                    isLight ? 'border-sky-200 bg-sky-50/80 text-slate-800' : 'border-cyan-500/30 bg-cyan-950/50'
                  }`}>
                    <div className={`flex items-center gap-2 text-xs font-bold ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                      <Bot size={16} /> Nhận xét từ SNAPDECK AI:
                    </div>
                    <p className={`mt-1.5 text-sm italic leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                      "{aiFeedback}"
                    </p>
                  </div>
                )}
              </div>

              {typeof groupScore === 'number' && (
                <div className={`rounded-2xl border p-4 ${
                  isLight ? 'border-sky-200 bg-sky-50/60' : 'border-cyan-400/25 bg-cyan-950/30'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wide ${isLight ? 'text-sky-700' : 'text-cyan-200'}`}>Điểm đánh giá nhóm</p>
                  <p className={`mt-1 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {Number.isInteger(groupScore) ? groupScore : groupScore.toFixed(1)}
                    <span className={`ml-1 text-base font-semibold ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>/ 100</span>
                  </p>
                  <p className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>Điểm đánh giá tách biệt với XP nhận được.</p>
                </div>
              )}

              {/* Passed vs rejected layout */}
              {passed ? (
                /* Success Layout */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-2xl border p-4 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
                  }`}>
                    <div className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ĐIỂM CƠ BẢN</div>
                    <div className={`text-3xl font-black mt-1 ${isLight ? 'text-sky-600' : 'text-cyan-300'}`}>+{scoreBreakdown?.basePoints ?? score}</div>
                  </div>

                  <div className={`rounded-2xl border p-4 ${
                    isLight ? 'border-emerald-200 bg-emerald-50/70' : 'border-fuchsia-500/40 bg-fuchsia-500/15'
                  }`}>
                    <div className={`text-xs font-bold uppercase ${isLight ? 'text-emerald-700' : 'text-fuchsia-300'}`}>TỔNG ĐIỂM ĐƯỢC DUYỆT</div>
                    <div className={`text-3xl font-black mt-1 ${isLight ? 'text-emerald-600' : 'text-amber-400'}`}>+{score}</div>
                  </div>
                  </div>
                  <div className={`rounded-xl border p-3 text-left text-sm ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-slate-950/60 text-slate-300'
                  }`}>
                    Điểm cơ bản: {scoreBreakdown?.basePoints ?? score}
                    {' · '}Thưởng ảnh: {scoreBreakdown?.photoBonus ?? 0}
                    {' · '}Thưởng sáng tạo: {scoreBreakdown?.creativityBonus ?? 0}
                  </div>
                </div>
              ) : mode === 'spicy' ? (
                /* Timeout / Penalty Screen Layout */
                <div className={`rounded-3xl border p-6 space-y-6 text-left ${
                  isLight ? 'border-rose-200 bg-rose-50/60 shadow-lg text-slate-800' : 'border-red-500/40 bg-red-950/30'
                }`}>
                  {/* Mode Selector Header */}
                  <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                    <div>
                      <h3 className={`text-xl font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <Flame className="text-fuchsia-500 animate-bounce" /> Hoạt động vui tùy chọn 🌶️
                      </h3>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Không có điểm bị trừ. Nhóm có thể bỏ qua hoặc tự chọn một hoạt động vui.
                      </p>
                    </div>

                    <div className={`flex rounded-2xl border p-1 ${isLight ? 'border-slate-200 bg-white/90 shadow-sm' : 'border-white/15 bg-slate-950'}`}>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setPenaltyMode('random');
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${penaltyMode === 'random' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        🎲 Quay Ngẫu Nhiên
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setPenaltyMode('custom');
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${penaltyMode === 'custom' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        ✍️ Tự Chọn / Tự Nghĩ
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Random Spin */}
                  {penaltyMode === 'random' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Vòng Quay Vòng Phạt Ngẫu Nhiên</span>
                        <button
                          onClick={handleSpinWheel}
                          disabled={spinning}
                          className="rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-xl shadow-fuchsia-500/30 hover:scale-105 transition disabled:opacity-50"
                        >
                          {spinning ? 'Đang quay...' : '🎲 QUAY VÒNG PHẠT'}
                        </button>
                      </div>

                      {selectedPunishment && !customApplied && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`rounded-2xl border p-4 flex items-center gap-4 shadow-xl ${
                            isLight ? 'border-pink-200 bg-white text-slate-800 shadow-pink-900/5' : 'border-fuchsia-500/40 bg-fuchsia-950/60'
                          }`}
                        >
                          <div className="text-4xl">{selectedPunishment.icon}</div>
                          <div>
                            <div className="text-xs font-bold uppercase text-fuchsia-500">Kết Quả Vòng Quay Ngẫu Nhiên:</div>
                            <div className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedPunishment.title}</div>
                            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{selectedPunishment.description}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Custom or Predefined Selection */}
                  {penaltyMode === 'custom' && (
                    <div className="space-y-5">
                      {/* Predefined Quick Chips */}
                      <div>
                        <label className={`text-xs font-bold block mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Chọn nhanh từ danh sách hình phạt vui vẻ:</label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {PUNISHMENTS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPredefined(p)}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                selectedPunishment?.id === p.id && customApplied
                                  ? isLight
                                    ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500'
                                    : 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400'
                                  : isLight
                                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <span className="text-2xl">{p.icon}</span>
                              <div>
                                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.title}</div>
                                <div className={`text-[11px] line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{p.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Input Form */}
                      <form onSubmit={handleApplyCustomInput} className={`rounded-2xl border p-4 space-y-3 ${
                        isLight ? 'border-sky-200 bg-white/90 shadow-sm' : 'border-cyan-500/30 bg-slate-950/80'
                      }`}>
                        <label className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                          <PenTool size={14} /> Hoặc tự nhập hình phạt sáng tạo của nhóm bạn:
                        </label>

                        <input
                          type="text"
                          placeholder="Ví dụ: Nhảy 5 cái theo điệu nhún, Nói bằng giọng miền Nam trong 1 phút..."
                          value={customPenaltyTitle}
                          onChange={(e) => setCustomPenaltyTitle(e.target.value)}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none ${
                            isLight
                              ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                              : 'border-white/15 bg-slate-900 text-white placeholder-slate-500 focus:border-cyan-400'
                          }`}
                        />

                        <input
                          type="text"
                          placeholder="Ghi chú chi tiết thêm (không bắt buộc)..."
                          value={customPenaltyDesc}
                          onChange={(e) => setCustomPenaltyDesc(e.target.value)}
                          className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                              : 'border-white/15 bg-slate-900 text-white placeholder-slate-500 focus:border-cyan-400'
                          }`}
                        />

                        <button
                          type="submit"
                          className={`w-full rounded-xl py-2.5 text-xs font-bold shadow-lg transition ${
                            isLight ? 'btn-blue-gradient text-white shadow-sky-500/20' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 hover:scale-102'
                          }`}
                        >
                          ✓ Xác Nhận Áp Dụng Hình Phạt Tự Nhập Này
                        </button>
                      </form>

                      {/* Display Selected Custom Punishment */}
                      {selectedPunishment && customApplied && (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`rounded-2xl border p-4 flex items-center gap-4 shadow-xl ${
                            isLight ? 'border-sky-300 bg-sky-50 text-slate-800' : 'border-cyan-400/40 bg-cyan-950/40'
                          }`}
                        >
                          <div className="text-3xl">{selectedPunishment.icon}</div>
                          <div>
                            <div className={`text-xs font-bold uppercase flex items-center gap-1 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                              <CheckCircle2 size={14} /> Hình Phạt Được Chọn:
                            </div>
                            <div className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedPunishment.title}</div>
                            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{selectedPunishment.description}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* SAFETY & POSITIVE VIBES DISCLAIMER NOTE */}
                  <div className={`rounded-2xl border p-4 space-y-1.5 text-xs ${
                    isLight ? 'border-amber-200 bg-amber-50/90 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}>
                    <div className="font-bold flex items-center gap-2 text-amber-500 text-sm">
                      <HeartHandshake size={18} /> THÔNG ĐIỆP VĂN MINH & AN TOÀN KHI CHƠI
                    </div>
                    <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <strong>SNAPDECK</strong> được thiết kế nhằm mang lại những tiếng cười sảng khoái và gắn kết tinh thần đồng đội.
                      <strong>Tuyệt đối không khuyến khích</strong> các hình phạt tiêu cực, mang tính bạo lực, hạ thấp danh dự hoặc gây nguy hiểm đến tính mạng, sức khỏe người chơi.
                      Hãy luôn ưu tiên những hình phạt hài hước, dí dỏm, nhẹ nhàng và an toàn nhất cho tất cả các thành viên!
                    </p>
                  </div>
                </div>
              ) : timedOut || skipped ? (
                <div className={`rounded-2xl border p-4 text-sm ${
                  isLight ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-red-400/25 bg-red-500/10 text-red-100'
                }`}>
                  Điểm thưởng lượt này: <strong>0 XP</strong>. Ván chơi tiếp tục theo đúng thứ tự người chơi.
                </div>
              ) : null}

              {showRoundSummary && (
                <section className={`rounded-2xl border p-4 text-left ${
                  isLight ? 'border-amber-200 bg-amber-50/80 text-slate-800' : 'border-amber-400/30 bg-amber-500/10'
                }`}>
                  <h2 className={`text-lg font-black ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                    {showFinalSummary ? 'Tổng kết cuối ván' : `Tổng kết vòng ${round}`}
                  </h2>
                  <p className={`mt-1 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Bảng điểm cộng dồn sau khi mọi người đã hoàn thành lượt trong vòng này.</p>
                  <ol className="mt-3 space-y-2">
                    {[...players].sort((a, b) => b.score - a.score).map((player, index) => (
                      <li key={player.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                        isLight ? 'bg-white border border-slate-100 text-slate-900 shadow-sm' : 'bg-slate-950/50 text-white'
                      }`}>
                        <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{index + 1}. {player.name}</span>
                        <span className={`font-black ${isLight ? 'text-sky-600' : 'text-cyan-300'}`}>{player.score} XP</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Action Buttons */}
              <div className="pt-4">
                <div className={`grid gap-3 ${passed ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNextRound}
                    disabled={advancing}
                    className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-black shadow-xl disabled:opacity-60 transition ${
                      isLight
                        ? 'btn-blue-gradient text-white shadow-sky-500/20'
                        : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-white shadow-fuchsia-500/30'
                    }`}
                  >
                    {advancing
                      ? 'Đang đồng bộ…'
                      : showRoundSummary
                        ? showFinalSummary ? 'Xem bảng xếp hạng cuối ván' : `Bắt đầu vòng ${currentRound}`
                        : gameStatus === 'completed' || (deviceMode === 'single_device' && totalRounds > 0 && currentTurnIndex + 1 >= totalRounds * players.length)
                          ? 'Xem bảng xếp hạng'
                          : currentRound > round
                            ? `Tổng kết vòng ${round}`
                            : `Chuyển lượt · vòng ${round}`} <ArrowRight size={18} />
                  </motion.button>
                </div>
                {progressError && <p role="alert" className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{progressError}</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal: Phóng to xem lại ảnh đã chọn */}
      <AnimatePresence>
        {isImageModalOpen && evidence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setIsImageModalOpen(false)}
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
                    Ảnh Bằng Chứng Vòng {round} · {currentPlayer.name}
                  </span>
                  <h4 className="text-base font-black text-white sm:text-lg">
                    {passed ? `Thử thách ĐẠT (${matchPercentage !== undefined ? `${matchPercentage}%` : `+${score} XP`})` : `Thử thách KHÔNG ĐẠT (${matchPercentage !== undefined ? `${matchPercentage}%` : '0 XP'})`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25 active:scale-95"
                  title="Đóng xem ảnh"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/75 p-2">
                <img
                  src={evidence}
                  alt="Ảnh bằng chứng phóng to"
                  className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Người chơi: <strong className="text-slate-200">{currentPlayer.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95"
                >
                  Đóng (ESC)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultPage;