import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

const steps = ['Đang tải dữ liệu ảnh...', 'Quét lưới khuôn mặt (FaceMesh)...', 'Phân tích tư thế & cử chỉ...', 'AI đang tính điểm số...'];

const AIVerifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRound, addPhotoToCurrentAlbum, activeCard, getCurrentPlayer, addScoreToPlayer } = useGame();

  const round = location.state?.round ?? currentRound;
  const currentPlayer = getCurrentPlayer(round);
  const capturedImage = location.state?.image || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80';

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);

  // AI Breakdown scores
  const [expressionScore] = useState(96);
  const [poseScore] = useState(94);
  const [syncScore] = useState(98);
  const totalScore = Math.round((expressionScore + poseScore + syncScore) / 3);

  useEffect(() => {
    let current = 0;
    const interval = window.setInterval(() => {
      current += 25;
      setProgress(current);
      if (current === 25) setStep(1);
      if (current === 50) setStep(2);
      if (current === 75) setStep(3);

      if (current >= 100) {
        window.clearInterval(interval);
        setFinished(true);
        sound.playSuccess();

        // Save to active album context
        addPhotoToCurrentAlbum({
          round,
          image: capturedImage,
          cardTitle: activeCard?.title || 'Thử thách',
          score: totalScore,
          mission: activeCard?.mission || '',
        });

        // Award score XP to active player for this round
        addScoreToPlayer(currentPlayer.id, totalScore * 2);
      }
    }, 600);

    return () => window.clearInterval(interval);
  }, [capturedImage, round, activeCard, addPhotoToCurrentAlbum, totalScore, currentPlayer, addScoreToPlayer]);

  const handleContinue = () => {
    sound.playClick();
    navigate('/result', {
      state: {
        round,
        passed: true,
        score: totalScore,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
          <div className="my-auto py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/20 text-cyan-300">
                    <BrainCircuit size={26} className="animate-spin text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white sm:text-3xl">AI Verification Engine</h1>
                    <p className="text-xs text-cyan-300 font-semibold">Model: Deep Vision Face & Pose Net v2.4</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3.5 py-1.5 text-xs font-bold text-fuchsia-300 border border-fuchsia-400/30">
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-5 w-5 rounded-full object-cover" />
                    <span>Lượt của: {currentPlayer.name}</span>
                  </div>
                  <div className="rounded-full bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                    Vòng {round}
                  </div>
                </div>
              </div>

              {/* Scan Stage Container */}
              <div className="grid gap-6 md:grid-cols-2 items-center">
                {/* Photo with Mesh Grid Overlay */}
                <div className="relative mx-auto h-[360px] w-full max-w-xs overflow-hidden rounded-[2rem] border-2 border-cyan-400/40 bg-slate-950 shadow-2xl">
                  <img src={capturedImage} alt="Captured" className="h-full w-full object-cover" />

                  {/* Scanning Overlay Animation */}
                  {!finished && (
                    <motion.div
                      animate={{ y: [-180, 180, -180] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
                    />
                  )}

                  {/* Face Mesh Simulation Points */}
                  <div className="absolute inset-0 pointer-events-none border-[10px] border-cyan-400/20 rounded-[2rem]">
                    <div className="absolute top-1/3 left-1/3 h-4 w-4 rounded-full border border-cyan-400 animate-ping" />
                    <div className="absolute top-1/3 right-1/3 h-4 w-4 rounded-full border border-cyan-400 animate-ping" />
                    <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 h-6 w-12 rounded-full border border-cyan-400 animate-pulse" />
                  </div>
                </div>

                {/* AI Scores Breakdown */}
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tiêu Chí Phân Tích AI:</p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-200 mb-1">
                        <span>Biểu Cảm Khuôn Mặt (Expression Match)</span>
                        <span className="text-cyan-400">{expressionScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${expressionScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-200 mb-1">
                        <span>Tư Thế & Cử Chỉ (Pose Sync)</span>
                        <span className="text-fuchsia-400">{poseScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-fuchsia-400 transition-all duration-500" style={{ width: `${poseScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-200 mb-1">
                        <span>Độ Đồng Bộ Nhóm (Group Harmony)</span>
                        <span className="text-amber-400">{syncScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${syncScore}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Total AI Score Banner */}
                  {finished && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center space-y-1"
                    >
                      <span className="text-xs font-bold text-emerald-400 uppercase">TỔNG ĐIỂM AI MATCH</span>
                      <div className="text-4xl font-black text-white">{totalScore} / 100</div>
                      <p className="text-xs text-emerald-300 font-semibold">✓ ĐẠT THỬ THÁCH XUẤT SẮC!</p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {!finished && (
                <div className="space-y-2 text-center">
                  <p className="text-xs text-cyan-300 font-bold animate-pulse">{steps[step]}</p>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Continue Button */}
              {finished && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 font-black text-white text-lg shadow-2xl shadow-fuchsia-500/30"
                >
                  Xem Kết Quả & Vinh Danh →
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIVerifyPage;