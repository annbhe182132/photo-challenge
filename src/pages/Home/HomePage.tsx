import { motion } from 'framer-motion';
import {
  Brain,
  Camera,
  Crown,
  Flame,
  PlayCircle,
  QrCode,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

const featureCards = [
  {
    icon: Camera,
    title: 'Ghi lại khoảnh khắc Phygital',
    description: 'Rút bài thật, quét QR trên WebApp và nhận thử thách chụp ảnh cực vui nhộn.',
  },
  {
    icon: Brain,
    title: 'Chấm Điểm AI Thông Minh',
    description: 'Thuật toán AI tự động kiểm tra cảm xúc, tư thế và sự đồng bộ của cả nhóm.',
  },
  {
    icon: Crown,
    title: 'Vòng Quay Hình Phạt 🌶️',
    description: 'Thử thách và hình phạt hài hước tức thì khi điểm số AI dưới mức quy định.',
  },
];

const steps = ['Rút Thẻ Bài Thật', 'Quét Mã QR Bài', 'Nhận Thử Thách & Chụp', 'AI Chấm Điểm & Phạt'];

const particles = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  top: `${8 + (index % 7) * 12}%`,
  left: `${5 + (index % 5) * 16}%`,
  size: 8 + (index % 4) * 6,
  delay: index * 0.2,
}));

const HomePage = () => {
  const navigate = useNavigate();
  const { soundEnabled, toggleSound, investorMode, toggleInvestorMode } = useGame();

  // Flow 2: Host Creates Room -> Configure Lobby first -> Pick Card later
  const handleStartGame = () => {
    sound.playClick();
    navigate('/lobby', { state: { isHost: true } });
  };

  // Flow 1: Quick QR Scan from Home -> Open Camera QR Scanner -> Join Room Lobby
  const handleScanQR = () => {
    sound.playClick();
    navigate('/scan', { state: { fromHomeScan: true } });
  };

  const handleAdmin = () => {
    sound.playClick();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen">
        {/* Ambient Particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl"
            animate={{ y: [0, 24, 0], x: [0, 18, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-0 top-20 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl"
            animate={{ y: [0, -28, 0], x: [0, -20, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl"
            animate={{ y: [0, 20, 0], x: [0, 16, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              className="absolute rounded-full bg-white/35"
              style={{ top: particle.top, left: particle.left, width: particle.size, height: particle.size }}
              animate={{ y: [0, -10, 0], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 4 + (particle.id % 4), repeat: Infinity, delay: particle.delay }}
            />
          ))}
        </div>

        {/* Investor Banner */}
        <div className="relative z-20 border-b border-cyan-500/30 bg-cyan-950/40 px-4 py-2 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Sparkles className="h-4 w-4 animate-spin text-cyan-400" />
              <span>CHẾ ĐỘ DEMO HỘI ĐỒNG & NHÀ ĐẦU TƯ: Phygital Party Game thế hệ mới kết hợp AI</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleInvestorMode}
                className={`rounded-full px-3 py-1 font-bold transition ${investorMode ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
              >
                {investorMode ? '● Pitch Mode: ON' : '○ Pitch Mode: OFF'}
              </button>
              <button
                onClick={handleAdmin}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-cyan-300 font-bold hover:bg-cyan-500/20"
              >
                🔑 Investor Portal & Admin
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
          <a href="#home" className="flex items-center gap-3 text-lg font-black tracking-[0.25em] text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/20 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Camera className="h-5 w-5 text-cyan-300" />
            </div>
            PHOTO CHALLENGE
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
            <a href="#home" className="transition hover:text-cyan-300">Trang chủ</a>
            <a href="#comparison" className="transition hover:text-cyan-300">Vì sao chọn Photo Challenge?</a>
            <a href="#how-it-works" className="transition hover:text-cyan-300">Luồng Phygital</a>
            <button onClick={() => navigate('/gallery')} className="transition hover:text-cyan-300">Bộ Sưu Tập</button>
            <button onClick={() => navigate('/leaderboard')} className="transition hover:text-cyan-300">Xếp Hạng</button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-slate-300 backdrop-blur-xl transition hover:bg-white/20"
              title="Tắt/Mở âm thanh Sci-Fi"
            >
              {soundEnabled ? <Volume2 size={18} className="text-cyan-300" /> : <VolumeX size={18} className="text-slate-500" />}
            </button>
          </div>
        </header>

        {/* Main Hero */}
        <main id="home" className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 pb-20 sm:px-8 lg:px-10">
          <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 backdrop-blur-xl">
                <Zap className="h-4 w-4 text-amber-400 animate-bounce" />
                Dự Án Board Game Phygital Đầu Tiên Tại Việt Nam Tích Hợp AI
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  PHOTO
                  <span className="block bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(217,70,239,0.3)]">
                    CHALLENGE
                  </span>
                </h1>
                <p className="max-w-xl text-lg text-slate-300 sm:text-xl leading-relaxed">
                  Trò chơi kết hợp <strong className="text-cyan-300 font-bold">Bộ Bài Vật Lý 24 Lá</strong> và <strong className="text-fuchsia-300 font-bold whitespace-nowrap">Web App Nhận Diện AI</strong>. Tạo khoảnh khắc bùng nổ, tương tác nhóm thật & lưu giữ kỉ niệm vô giá!
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleStartGame}
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-7 py-4 font-bold text-white shadow-2xl shadow-fuchsia-500/30 transition hover:shadow-cyan-500/40"
                >
                  <PlayCircle className="h-6 w-6 transition group-hover:rotate-12" />
                  Vào Phòng Chơi Phygital
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleScanQR}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-7 py-4 font-bold text-cyan-200 backdrop-blur-xl transition hover:bg-cyan-500/20"
                >
                  <QrCode className="h-6 w-6 text-cyan-400" />
                  Quét QR Tham Gia Phòng
                </motion.button>
              </div>
            </motion.div>

            {/* Interactive Showcase Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            >
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Phòng Demo Trực Tiếp</span>
                    <p className="text-2xl font-black text-white">ROOM-8899</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    4 Người Chơi
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/30 to-violet-950/40 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-fuchsia-400">Thử Thách Đang Chơi</p>
                      <p className="text-lg font-bold text-white mt-1">Cạn Ly Đồng Điệu</p>
                    </div>
                    <div className="rounded-xl bg-fuchsia-500/20 p-3 text-fuchsia-300">
                      <Flame className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">Cùng 3 người bạn nâng cốc và hô 23 Dzô!</p>
                  <div className="mt-4 flex justify-between text-xs font-semibold text-slate-300">
                    <span>Độ khớp AI yêu cầu: 85%</span>
                    <span className="text-amber-400 font-bold">+50 XP</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">Công Nghệ AI</p>
                    <p className="text-lg font-black text-cyan-300">Face & Pose HUD</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">Vòng Quay Phạt</p>
                    <p className="text-lg font-black text-amber-400">Tự Động Spin</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Comparison Section vs Traditional Games */}
          <section id="comparison" className="py-16">
            <div className="mb-10 text-center space-y-3">
              <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">
                Đột Phá Thị Trường Boardgame
              </span>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                Vì Sao Photo Challenge Vượt Xa UNO, Ma Sói & Truth or Dare?
              </h2>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Kết hợp yếu tố vật lý của lá bài và sức mạnh số của WebApp AI, giải quyết triệt để sự chán nản & nghiện điện thoại cá nhân.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 font-black">
                  VS
                </div>
                <h3 className="text-xl font-bold text-white">So Với Board Game UNO</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  UNO chỉ ngồi một chỗ đánh bài đơn điệu. **Photo Challenge** buộc người chơi phải tương tác hành động thực tế, đứng dậy chụp ảnh kỉ niệm và tạo không khí bùng nổ!
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-300 font-black">
                  VS
                </div>
                <h3 className="text-xl font-bold text-white">So Với Ma Sói</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ma Sói đòi hỏi luật phức tạp và người bị loại sớm sẽ đứng ngoài. **Photo Challenge** giữ 100% thành viên tham gia liên tục mọi vòng chơi mà không ai bị bỏ rơi!
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 font-black">
                  VS
                </div>
                <h3 className="text-xl font-bold text-white">So Với Truth or Dare</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Truth or Dare dễ bị bí ý tưởng và gian lận. **Photo Challenge** có bộ đếm giờ, AI trọng tài khách quan và Vòng Quay Hình Phạt tự động cực kỳ hài hước!
                </p>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-10">
            <div className="grid gap-6 lg:grid-cols-3">
              {featureCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-xl"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-cyan-200">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </section>

          {/* Flow Steps */}
          <section id="how-it-works" className="py-16">
            <div className="mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Luồng Hoạt Động Phygital</span>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Dễ Dàng Bắt Đầu Trong 4 Bước</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className="relative rounded-[1.75rem] border border-white/15 bg-white/10 p-6 text-center backdrop-blur-xl"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{step}</h3>
                </motion.div>
              ))}
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-white/10 bg-slate-950/60 px-6 py-8 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
            <p className="font-semibold text-slate-300">PHOTO CHALLENGE — Phygital Party Game Platform</p>
            <div className="flex items-center gap-4">
              <button onClick={handleAdmin} className="text-cyan-400 font-bold hover:underline">
                Portal Nhà Đầu Tư & Quản Trị (/admin)
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
