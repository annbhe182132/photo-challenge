import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Copy, PlayCircle, Sparkles, UserPlus, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { THEMES } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';

const LobbyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode, theme, setTheme, mode, setMode, players, setPlayers } = useGame();

  const [copied, setCopied] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Check if player came from Home -> Scan QR camera join
  const joinedFromQR = location.state?.joinedFromQR ?? false;

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sound.playClick();
    const newP = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newPlayerName}`,
      score: 0,
      streak: 0,
      badges: ['🔥 Newbie'],
    };
    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName('');
  };

  const handleProceedToScanOrChallenge = () => {
    sound.playSuccess();
    // Host proceeds to card picker / QR scanner
    navigate('/scan');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
            animate={{ y: [0, 18, 0], x: [0, 16, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
            animate={{ y: [0, -22, 0], x: [0, -12, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
          <button
            onClick={() => {
              sound.playClick();
              navigate('/');
            }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </button>

          <div className="flex flex-1 items-center justify-center py-6">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-4xl rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-8"
            >
              {/* Joined from QR Status Banner */}
              {joinedFromQR && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> ĐÃ GIA NHẬP PHÒNG THÀNH CÔNG BẰNG QR!
                  </span>
                  <p className="text-sm font-bold text-white">Bạn đang có mặt trong phòng chờ {roomCode}</p>
                </div>
              )}

              {/* Header Info */}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-bold text-cyan-300">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Sảnh Phòng Chơi Phygital
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                    Phòng Chờ & Cấu Hình
                  </h1>
                  <p className="mt-2 text-sm text-slate-300">
                    Thêm thành viên, chọn cấu hình phòng chơi trước khi chọn lá bài!
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mã Phòng Chơi</p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="text-2xl font-black tracking-[0.25em] text-cyan-300">{roomCode}</span>
                    <button
                      onClick={handleCopy}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-200 transition hover:bg-cyan-500/20"
                      title="Sao chép mã phòng"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <h3 className="text-base font-bold text-white mb-3">1. Chọn Chủ Đề Bộ Bài Physical</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        sound.playClick();
                        setTheme(t);
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${theme.id === t.id
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                    >
                      <div className="text-2xl">{t.icon}</div>
                      <div className="mt-2 font-bold text-white text-sm">{t.name}</div>
                      <div className="mt-1 text-xs text-slate-400 line-clamp-2">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Mode Selection */}
              <div>
                <h3 className="text-base font-bold text-white mb-3">2. Chế Độ Chơi & Hình Phạt</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setMode('casual');
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'casual'
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      🟢 Casual Party
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Chơi nhẹ nhàng, tập trung khoảnh khắc vui vẻ.</p>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setMode('speedrun');
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'speedrun'
                      ? 'border-cyan-400 bg-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      ⚡ Speed Run 15s
                    </div>
                    <p className="text-xs text-slate-400 mt-1">15 giây chụp siêu nhanh, đòi hỏi phản xạ cực đỉnh!</p>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setMode('spicy');
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'spicy'
                      ? 'border-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.25)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      🌶️ Spicy & Penalty Spin
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Có Vòng Quay Hình Phạt nếu AI chấm điểm không đạt!</p>
                  </button>
                </div>
              </div>

              {/* Player Roster */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-cyan-300" />
                    3. Danh Sách Thành Viên Trong Phòng ({players.length} Thành Viên)
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence>
                    {players.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-xl"
                      >
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="h-12 w-12 rounded-full border border-cyan-400/40 bg-slate-800 object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-white text-sm flex items-center gap-2">
                            {player.name}
                            {index === 0 && <span className="text-xs text-amber-400 font-bold">👑 Host</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                              <CheckCircle2 size={12} /> Đã có mặt
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Quick Add Player Form */}
                <form onSubmit={handleAddPlayer} className="mt-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="Nhập tên thành viên mới gia nhập..."
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/30"
                  >
                    <UserPlus size={16} /> Thêm thành viên
                  </button>
                </form>
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleProceedToScanOrChallenge}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-4 text-lg font-black text-white shadow-2xl shadow-fuchsia-500/30 transition hover:shadow-cyan-500/40"
              >
                <PlayCircle className="h-6 w-6" />
                Tất Cả Thành Viên Đã Đủ → Tiếp Theo: Chọn & Quét Lá Bài
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
