import { motion } from 'framer-motion';
import { ArrowLeft, Crown, PlayCircle, Share2, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { players, resetGame } = useGame();

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top1 = sorted[0];
  const top2 = sorted[1];
  const top3 = sorted[2];
  const others = sorted.slice(3);

  const handlePlayAgain = () => {
    sound.playClick();
    resetGame();
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
            >
              <ArrowLeft size={18} /> Trang chủ
            </button>

            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300">
              <Trophy size={14} className="text-amber-400" /> BẢNG XẾP HẠNG CHAMPION
            </div>
          </div>

          <div className="my-auto py-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white sm:text-5xl">Vinh Danh Người Chơi MVP</h1>
              <p className="text-sm text-slate-300">Tổng kết điểm số & huy hiệu qua các vòng chơi Phygital Photo Challenge</p>
            </div>

            {/* 3D Podium for Top 3 */}
            <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto pt-8">
              {/* 2nd Place */}
              {top2 && (
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <img src={top2.avatar} alt={top2.name} className="h-16 w-16 rounded-full border-2 border-slate-300 object-cover shadow-lg" />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      🥈 2ND
                    </span>
                  </div>
                  <div className="w-full rounded-t-2xl border border-slate-400/30 bg-slate-800/80 p-4 text-center h-36 flex flex-col justify-center">
                    <div className="font-bold text-white text-sm truncate">{top2.name}</div>
                    <div className="text-xl font-black text-slate-300 mt-1">{top2.score} XP</div>
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {top1 && (
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <Crown className="h-8 w-8 text-amber-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                    <img src={top1.avatar} alt={top1.name} className="h-20 w-20 rounded-full border-4 border-amber-400 object-cover shadow-2xl shadow-amber-500/30" />
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-slate-950 shadow-lg">
                      👑 1ST MVP
                    </span>
                  </div>
                  <div className="w-full rounded-t-2xl border border-amber-400/40 bg-gradient-to-b from-amber-950/60 to-slate-900 p-4 text-center h-48 flex flex-col justify-center">
                    <div className="font-black text-white text-base truncate">{top1.name}</div>
                    <div className="text-2xl font-black text-amber-400 mt-1">{top1.score} XP</div>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <img src={top3.avatar} alt={top3.name} className="h-16 w-16 rounded-full border-2 border-amber-700 object-cover shadow-lg" />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-black text-white">
                      🥉 3RD
                    </span>
                  </div>
                  <div className="w-full rounded-t-2xl border border-amber-700/30 bg-slate-900/80 p-4 text-center h-28 flex flex-col justify-center">
                    <div className="font-bold text-white text-sm truncate">{top3.name}</div>
                    <div className="text-lg font-black text-amber-500 mt-1">{top3.score} XP</div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Remaining players list */}
            {others.length > 0 && (
              <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-3 max-w-2xl mx-auto">
                {others.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-400">#{idx + 4}</span>
                      <img src={p.avatar} alt={p.name} className="h-10 w-10 rounded-full border border-white/10" />
                      <span className="font-semibold text-white text-sm">{p.name}</span>
                    </div>
                    <span className="font-bold text-cyan-300 text-sm">{p.score} XP</span>
                  </div>
                ))}
              </div>
            )}

            {/* End Game Action Buttons: Gallery Album & Play Again */}
            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto pt-4">
              <button
                onClick={() => {
                  sound.playClick();
                  navigate('/gallery');
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/20 py-4 font-bold text-cyan-200 transition hover:bg-cyan-500/30 backdrop-blur-xl shadow-xl"
              >
                <Share2 size={20} /> Xem Album Ảnh Kỉ Niệm Ván Chơi
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayAgain}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 font-black text-white text-base shadow-2xl shadow-fuchsia-500/30"
              >
                <PlayCircle size={20} /> Chơi Ván Mới Phygital
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;