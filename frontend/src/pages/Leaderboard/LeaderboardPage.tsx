import { motion } from 'framer-motion';
import { ArrowLeft, Crown, PlayCircle, Share2, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import { ThemeToggle } from '../../components/ThemeToggle';
import { sound } from '../../utils/soundEngine';
import EndGameAlbumPrompt from '../../components/gallery/EndGameAlbumPrompt';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { players, resetGame, themeMode } = useGame();
  const isLight = themeMode === 'light';

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top1 = sorted[0];
  const top2 = sorted[1];
  const top3 = sorted[2];
  const others = sorted.slice(3);
  const tiedForFirst = Boolean(top1 && top2 && top1.score === top2.score);

  const handlePlayAgain = () => {
    sound.playClick();
    resetGame();
    navigate('/lobby');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isLight
        ? 'text-slate-900'
        : 'bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100'
    }`}>
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                  : 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <ArrowLeft size={18} /> Trang chủ
            </button>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${
                isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}>
                <Trophy size={14} className="text-amber-500" /> {tiedForFirst ? 'KẾT QUẢ HÒA ĐIỂM' : 'BẢNG XẾP HẠNG CHAMPION'}
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="my-auto py-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className={`text-4xl font-black sm:text-5xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {tiedForFirst ? 'Đồng Hạng MVP' : 'Vinh Danh Người Chơi MVP'}
              </h1>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Tổng kết điểm số & huy hiệu qua các vòng chơi Phygital SNAPDECK
              </p>
              {tiedForFirst && (
                <p className={`text-sm font-semibold ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                  Nhiều người chơi cùng đạt điểm cao nhất; ván chơi được công nhận hòa.
                </p>
              )}
            </div>

            {/* 3D Podium for Top 3 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto pt-6 sm:pt-8">
              {/* 2nd Place */}
              {top2 && (
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <img src={top2.avatar} alt={top2.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-slate-300 object-cover shadow-lg" />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-400 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-950 whitespace-nowrap">
                      {tiedForFirst ? '🤝 ĐỒNG HẠNG 1' : '🥈 2ND'}
                    </span>
                  </div>
                  <div className={`w-full rounded-t-2xl border p-2 sm:p-4 text-center h-28 sm:h-36 flex flex-col justify-center ${
                    isLight
                      ? 'border-slate-200 bg-gradient-to-b from-slate-100 to-white shadow-md'
                      : 'border-slate-400/30 bg-slate-800/80'
                  }`}>
                    <div className={`font-bold text-xs sm:text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{top2.name}</div>
                    <div className={`text-base sm:text-xl font-black mt-0.5 sm:mt-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{top2.score} XP</div>
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {top1 && (
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                    <img src={top1.avatar} alt={top1.name} className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-amber-400 object-cover shadow-2xl shadow-amber-500/30" />
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-black text-slate-950 shadow-lg whitespace-nowrap">
                      {tiedForFirst ? '🤝 ĐỒNG HẠNG 1' : '👑 1ST MVP'}
                    </span>
                  </div>
                  <div className={`w-full rounded-t-2xl border p-2 sm:p-4 text-center h-36 sm:h-48 flex flex-col justify-center ${
                    isLight
                      ? 'border-amber-300 bg-gradient-to-b from-amber-100/80 to-white shadow-xl shadow-amber-950/5'
                      : 'border-amber-400/40 bg-gradient-to-b from-amber-950/60 to-slate-900'
                  }`}>
                    <div className={`font-black text-xs sm:text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{top1.name}</div>
                    <div className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{top1.score} XP</div>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <img src={top3.avatar} alt={top3.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-amber-700 object-cover shadow-lg" />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-700 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white whitespace-nowrap">
                      🥉 3RD
                    </span>
                  </div>
                  <div className={`w-full rounded-t-2xl border p-2 sm:p-4 text-center h-24 sm:h-28 flex flex-col justify-center ${
                    isLight
                      ? 'border-orange-200 bg-gradient-to-b from-orange-50 to-white shadow-md'
                      : 'border-amber-700/30 bg-slate-900/80'
                  }`}>
                    <div className={`font-bold text-xs sm:text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{top3.name}</div>
                    <div className={`text-sm sm:text-lg font-black mt-0.5 sm:mt-1 ${isLight ? 'text-amber-800' : 'text-amber-500'}`}>{top3.score} XP</div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Remaining players list */}
            {others.length > 0 && (
              <div className={`rounded-3xl border p-6 backdrop-blur-xl space-y-3 max-w-2xl mx-auto ${
                isLight
                  ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-sky-950/5'
                  : 'border-white/15 bg-slate-900/60 text-white'
              }`}>
                {others.map((p, idx) => (
                  <div key={p.id} className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>#{idx + 4}</span>
                      <img src={p.avatar} alt={p.name} className={`h-10 w-10 rounded-full border ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
                      <span className={`font-semibold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.name}</span>
                    </div>
                    <span className={`font-bold text-sm ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>{p.score} XP</span>
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
                className={`flex items-center justify-center gap-2 rounded-2xl border py-4 font-bold backdrop-blur-xl shadow-lg transition ${
                  isLight
                    ? 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 shadow-sky-950/5'
                    : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                }`}
              >
                <Share2 size={20} /> Xem Album Ảnh Kỉ Niệm Ván Chơi
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayAgain}
                className={`flex items-center justify-center gap-2 rounded-2xl py-4 font-black text-white text-base shadow-2xl transition ${
                  isLight
                    ? 'btn-emerald-gradient shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 shadow-fuchsia-500/30'
                }`}
              >
                <PlayCircle size={20} /> Chơi Ván Mới Phygital
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      <EndGameAlbumPrompt />
    </div>
  );
};

export default LeaderboardPage;