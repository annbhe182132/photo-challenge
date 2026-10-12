import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Clock3, HelpCircle, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

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
  const { activeCard, currentRound, getCurrentPlayer } = useGame();

  const round = Math.min(location.state?.round ?? currentRound, 3);
  const currentPlayer = getCurrentPlayer(round);
  const captureTime = getCaptureTimeByDifficulty(activeCard.difficulty);
  const diffLabel = getDifficultyLabel(activeCard.difficulty);

  // Preparation Phase: Fixed 20 seconds for team preparation
  const [prepTimeLeft, setPrepTimeLeft] = useState(20);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setPrepTimeLeft(20);
  }, [activeCard]);

  const handleStartCamera = () => {
    sound.playClick();
    navigate('/camera', {
      state: { round, captureTime },
    });
  };

  useEffect(() => {
    if (prepTimeLeft <= 0) {
      sound.playScanBeep();
      // Auto move to camera phase when prep time ends
      handleStartCamera();
      return;
    }

    const interval = window.setInterval(() => {
      setPrepTimeLeft((prev) => {
        if (prev <= 5 && prev > 1) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [prepTimeLeft]);

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
                VÒNG {round} / 3
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
              {/* Preparation Timer Bar */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock3 className={`h-6 w-6 ${prepTimeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-cyan-300'}`} />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Thời Gian Chuẩn Bị Cả Nhóm (Cố định 20s)</p>
                    <p className="text-xs text-slate-300">
                      Thời gian bấm máy camera: <span className="font-bold text-cyan-300">{captureTime} giây</span>
                    </p>
                  </div>
                </div>
                <div className={`text-4xl font-black ${prepTimeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                  {prepTimeLeft}s
                </div>
              </div>

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
                    <Trophy size={18} /> +{activeCard.xp} XP Thưởng
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
                    <HelpCircle size={16} className="text-cyan-300" /> Xem Gợi Ý Tạo Dáng Đúng Chuẩn AI Match
                  </span>
                  <span>{showHint ? '▲ Đóng' : '▼ Mở'}</span>
                </button>
                {showHint && (
                  <p className="mt-3 text-xs text-cyan-200 leading-relaxed border-t border-white/10 pt-3">
                    💡 **Gợi ý từ AI**: Đảm bảo tất cả khuôn mặt các thành viên nằm trong khung hình sáng rõ, không bị che khuất và giữ biểu cảm đúng như yêu cầu của lá bài!
                  </p>
                )}
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartCamera}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 text-lg font-black text-white shadow-2xl shadow-fuchsia-500/30 transition hover:shadow-cyan-500/40"
              >
                <Camera className="h-6 w-6" />
                Sẵn Sàng → Mở Camera Chụp Ảnh ({captureTime}s)
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengePage;