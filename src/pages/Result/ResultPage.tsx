import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Flame, HeartHandshake, PenTool, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { PUNISHMENTS, type Punishment } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRound, setCurrentRound, getCurrentPlayer } = useGame();

  const round = location.state?.round ?? currentRound;
  const currentPlayer = getCurrentPlayer(round);
  const passed = location.state?.passed ?? true;
  const score = location.state?.score ?? (passed ? 96 : 0);

  // Penalty Section States
  const [penaltyMode, setPenaltyMode] = useState<'random' | 'custom'>('random');
  const [spinning, setSpinning] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<Punishment | null>(null);
  const [customPenaltyTitle, setCustomPenaltyTitle] = useState('');
  const [customPenaltyDesc, setCustomPenaltyDesc] = useState('');
  const [customApplied, setCustomApplied] = useState(false);

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

  const handleNextRound = () => {
    sound.playClick();
    if (round < 3) {
      setCurrentRound(round + 1);
      navigate('/scan');
    } else {
      navigate('/leaderboard');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        {/* Ambient Glow */}
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

        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
          <div className="my-auto py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6 text-center"
            >
              {/* Active Player Card Badge */}
              <div className="mx-auto flex w-fit items-center gap-2.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-5 py-2 text-xs font-bold text-fuchsia-300 backdrop-blur-xl shadow-lg">
                <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-6 w-6 rounded-full object-cover border border-fuchsia-300" />
                <span>Lượt chơi của: <strong className="text-white">{currentPlayer.name}</strong></span>
              </div>

              {/* Icon Header */}
              {passed ? (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-300 p-1 shadow-[0_0_40px_rgba(217,70,239,0.4)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
                    <Trophy className="h-10 w-10 text-amber-400 animate-bounce" />
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-red-500 via-orange-500 to-amber-500 p-1 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
                    <ShieldAlert className="h-10 w-10 text-red-400 animate-pulse" />
                  </div>
                </div>
              )}

              <div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${passed ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                >
                  <Sparkles size={14} /> HOÀN THÀNH VÒNG {round} / 3
                </span>
                <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {passed ? `Xuất Sắc! ${currentPlayer.name} Thắng Thử Thách` : `💥 ${currentPlayer.name.toUpperCase()} HẾT THỜI GIAN CHỤP ÁNH!`}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {passed
                    ? `${currentPlayer.name} cùng cả nhóm đã phối hợp tạo dáng ăn ý và được AI xác nhận!`
                    : `Đồng hồ đếm ngược đã về 0. ${currentPlayer.name} phải thực hiện Vòng Quay Hình Phạt!`}
                </p>
              </div>

              {/* Passed vs Timeout Layout */}
              {passed ? (
                /* Success Layout */
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-400 font-bold uppercase">ĐIỂM AI MATCH</div>
                    <div className="text-3xl font-black text-cyan-300 mt-1">{score} / 100</div>
                  </div>

                  <div className="rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/15 p-4">
                    <div className="text-xs text-fuchsia-300 font-bold uppercase">CỘNG XP CHO {currentPlayer.name.toUpperCase()}</div>
                    <div className="text-3xl font-black text-amber-400 mt-1">+{score * 2} XP</div>
                  </div>
                </div>
              ) : (
                /* Timeout / Penalty Screen Layout */
                <div className="rounded-3xl border border-red-500/40 bg-red-950/30 p-6 space-y-6 text-left">
                  {/* Mode Selector Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Flame className="text-fuchsia-400 animate-bounce" /> Màn Hình Áp Dụng Hình Phạt 🌶️
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Do không hoàn thành chụp ảnh đúng giờ, người thua/nhóm chơi phải chịu hình phạt.
                      </p>
                    </div>

                    <div className="flex rounded-2xl border border-white/15 bg-slate-950 p-1">
                      <button
                        onClick={() => {
                          sound.playClick();
                          setPenaltyMode('random');
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${penaltyMode === 'random' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        🎲 Quay Ngẫu Nhiên
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setPenaltyMode('custom');
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${penaltyMode === 'custom' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
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
                        <span className="text-xs font-bold uppercase text-slate-400">Vòng Quay Vòng Phạt Ngẫu Nhiên</span>
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
                          className="rounded-2xl border border-fuchsia-500/40 bg-fuchsia-950/60 p-4 flex items-center gap-4 shadow-xl"
                        >
                          <div className="text-4xl">{selectedPunishment.icon}</div>
                          <div>
                            <div className="text-xs font-bold uppercase text-fuchsia-400">Kết Quả Vòng Quay Ngẫu Nhiên:</div>
                            <div className="text-lg font-black text-white">{selectedPunishment.title}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{selectedPunishment.description}</div>
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
                        <label className="text-xs font-bold text-slate-300 block mb-2">Chọn nhanh từ danh sách hình phạt vui vẻ:</label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {PUNISHMENTS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPredefined(p)}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selectedPunishment?.id === p.id && customApplied
                                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                            >
                              <span className="text-2xl">{p.icon}</span>
                              <div>
                                <div className="text-xs font-bold text-white">{p.title}</div>
                                <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Input Form */}
                      <form onSubmit={handleApplyCustomInput} className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 space-y-3">
                        <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <PenTool size={14} /> Hoặc tự nhập hình phạt sáng tạo của nhóm bạn:
                        </label>

                        <input
                          type="text"
                          placeholder="Ví dụ: Nhảy 5 cái theo điệu nhún, Nói bằng giọng miền Nam trong 1 phút..."
                          value={customPenaltyTitle}
                          onChange={(e) => setCustomPenaltyTitle(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        />

                        <input
                          type="text"
                          placeholder="Ghi chú chi tiết thêm (không bắt buộc)..."
                          value={customPenaltyDesc}
                          onChange={(e) => setCustomPenaltyDesc(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                        />

                        <button
                          type="submit"
                          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-102 transition"
                        >
                          ✓ Xác Nhận Áp Dụng Hình Phạt Tự Nhập Này
                        </button>
                      </form>

                      {/* Display Selected Custom Punishment */}
                      {selectedPunishment && customApplied && (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="rounded-2xl border border-cyan-400/40 bg-cyan-950/40 p-4 flex items-center gap-4 shadow-xl"
                        >
                          <div className="text-3xl">{selectedPunishment.icon}</div>
                          <div>
                            <div className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1">
                              <CheckCircle2 size={14} /> Hình Phạt Được Chọn:
                            </div>
                            <div className="text-base font-black text-white">{selectedPunishment.title}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{selectedPunishment.description}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* SAFETY & POSITIVE VIBES DISCLAIMER NOTE */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5 text-xs text-amber-200">
                    <div className="font-bold flex items-center gap-2 text-amber-400 text-sm">
                      <HeartHandshake size={18} /> THÔNG ĐIỆP VĂN MINH & AN TOÀN KHI CHƠI
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      <strong>Photo Challenge</strong> được thiết kế nhằm mang lại những tiếng cười sảng khoái và gắn kết tinh thần đồng đội.
                      <strong>Tuyệt đối không khuyến khích</strong> các hình phạt tiêu cực, mang tính bạo lực, hạ thấp danh dự hoặc gây nguy hiểm đến tính mạng, sức khỏe người chơi.
                      Hãy luôn ưu tiên những hình phạt hài hước, dí dỏm, nhẹ nhàng và an toàn nhất cho tất cả các thành viên!
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4">
                <div className={`grid gap-3 ${passed ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                  {!passed && (
                    <button
                      onClick={() => {
                        sound.playClick();
                        navigate('/scan');
                      }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-4 font-bold text-white transition hover:bg-white/20"
                    >
                      Thử Lại Vòng Này
                    </button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNextRound}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 font-black text-white shadow-xl shadow-fuchsia-500/30"
                  >
                    {round < 3 ? `Chuyển Sang Vòng ${round + 1}` : 'Xem Bảng Xếp Hạng Top 1'} <ArrowRight size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;