import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Camera,
  Crown,
  PlayCircle,
  QrCode,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  ArrowRight,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import { apiRequest } from '../../services/api';
import type { Player } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';
import unoCompareImg from '../../assets/uno-compare.png';
import werewolfCompareImg from '../../assets/werewolf-compare.png';
import truthOrDareCompareImg from '../../assets/truth-or-dare-compare.png';
import ThemeToggle from '../../components/ThemeToggle';
import ThemeCardsShowcase from '../../components/ThemeCardsShowcase';

interface CreatedRoomResponse {
  success: boolean;
  data?: {
    roomCode?: string;
    players?: Player[];
  };
  playerToken?: string;
  message?: string;
}

const featureCards = [
  {
    icon: Camera,
    title: 'Ghi lại khoảnh khắc Phygital',
    description: 'Rút bài thật, quét QR trên WebApp và nhận thử thách chụp ảnh cực vui nhộn.',
  },
  {
    icon: Brain,
    title: 'Trọng tài AI & Đánh giá nhóm',
    description: 'Tùy chọn AI Chếck tự động chấm điểm độ sáng tạo hoặc để cả bàn cùng bỏ phiếu.',
  },
  {
    icon: Crown,
    title: 'Vòng Quay Hình Phạt 🌶️',
    description: 'Nhóm có thể chọn hình phạt vui nhộn khi thử thách không được duyệt.',
  },
];

const steps = [
  {
    title: 'Rút Thẻ Bài Thật',
    desc: 'Mở hộp, xáo đều 24 lá bài thử thách và đặt giữa bàn. Đến lượt ai, người đó rút 1 lá bài thật bất kỳ.',
    tag: 'Thẻ Bài Thật',
  },
  {
    title: 'Quét Mã QR Lá Bài',
    desc: 'Dùng camera trên WebApp này quét mã QR in trên lá bài để tải đúng nhiệm vụ vào màn hình game.',
    tag: 'Web & QR',
  },
  {
    title: 'Thực Hiện Thử Thách & Chụp',
    desc: 'Cùng nhóm bạn tạo dáng, diễn xuất hoặc tương tác theo yêu cầu trước khi đồng hồ đếm ngược hết giờ.',
    tag: 'Camera Thử Thách',
  },
  {
    title: 'Chấm Điểm & Đánh Giá',
    desc: 'Chọn AI Chếck tự động soi ảnh chấm điểm thần thái, hoặc để bạn bè cùng bàn bỏ phiếu biểu quyết.',
    tag: 'AI & Nhóm',
  },
];

const particles = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  top: `${8 + (index % 7) * 12}%`,
  left: `${5 + (index % 5) * 16}%`,
  size: 8 + (index % 4) * 6,
  delay: index * 0.2,
}));

const HomePage = () => {
  const navigate = useNavigate();
  const {
    soundEnabled,
    toggleSound,
    themeMode,
    investorMode,
    toggleInvestorMode,
    theme,
    mode,
    deviceMode,
    setDeviceMode,
    verificationMethod,
    photoBonusEnabled,
    setPhotoBonusEnabled,
    setRoomCode,
    setPlayers,
    setCurrentPlayerId,
    setRoomPlayerToken,
    setCurrentRound,
    setTotalRounds,
    totalRounds,
    turnDurationSeconds,
    beginLocalGame,
  } = useGame();
  const isLight = themeMode === 'light';
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const handleSingleDeviceStart = () => {
    const localRoomCode = `LOCAL-${Date.now().toString().slice(-6)}`;
    const localPlayers = [
      { id: 'player-1', name: 'Người chơi 1', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=player-1', score: 0, streak: 0, badges: ['🏠 Local'] },
    ];
    setRoomCode(localRoomCode);
    beginLocalGame();
    setPlayers(localPlayers);
    setCurrentPlayerId(null);
    setRoomPlayerToken(null);
    setCurrentRound(1);
    setTotalRounds(totalRounds);
    sound.playSuccess();
    navigate('/lobby', { state: { isHost: true, deviceMode: 'single_device' } });
  };

  // Flow 2: Host Creates Room -> Configure Lobby first -> Pick Card later
  const handleStartGame = async () => {
    if (deviceMode === 'single_device') {
      handleSingleDeviceStart();
      return;
    }
    sound.playClick();
    setIsCreatingRoom(true);
    setRoomError(null);
    try {
      const response = await apiRequest<CreatedRoomResponse>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.id,
          mode,
          deviceMode,
          verificationMethod: deviceMode === 'multi_device' ? 'ai' : verificationMethod,
          photoBonusEnabled,
          turnDurationSeconds,
          totalRounds,
          hostName: 'Host',
        }),
      });
      if (
        response.success !== true ||
        !response.data?.roomCode ||
        !Array.isArray(response.data.players)
        || typeof response.playerToken !== 'string'
      ) {
        throw new Error(response.message || 'Máy chủ không xác nhận được phòng mới.');
      }
      setRoomCode(response.data.roomCode);
      setPlayers(response.data.players);
      setCurrentPlayerId(response.data.players[0]?.id ?? null);
      setRoomPlayerToken(response.playerToken);
      setCurrentRound(1);
      navigate('/lobby', { state: { isHost: true } });
    } catch (error) {
      setRoomError(error instanceof Error
        ? error.message
        : 'Không thể tạo phòng chơi. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Mở camera để quét QR phòng như luồng tham gia phòng ban đầu.
  const handleScanQR = () => {
    sound.playClick();
    navigate('/scan', { state: { fromHomeScan: true } });
  };

  const handleAdmin = () => {
    sound.playClick();
    navigate('/admin');
  };

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-300 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      <div className="relative isolate min-h-screen">
        {/* Ambient Particles in Dark Mode */}
        {!isLight && (
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
        )}

        {/* Investor Banner */}
        <div className={`relative z-20 border-b px-4 py-2.5 backdrop-blur-xl transition-colors ${isLight ? 'border-sky-200/80 bg-white/75 text-sky-800' : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300'}`}>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
            <div className={`flex items-center gap-2 font-semibold ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
              <Sparkles className={`h-4 w-4 animate-spin ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span>NỀN TẢNG PHYGITAL: Trò chơi thẻ bài với Trọng tài AI Chếck & Bình chọn nhóm</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleInvestorMode}
                className={`rounded-full px-3.5 py-1 font-bold transition shadow-sm ${isLight ? (investorMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200') : (investorMode ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300')}`}
              >
                {investorMode ? '● Pitch Mode: ON' : '○ Pitch Mode: OFF'}
              </button>
              <button
                onClick={handleAdmin}
                className={`rounded-full border px-3.5 py-1 font-bold shadow-sm transition ${isLight ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'}`}
              >
                🔑 Investor Portal & Admin
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-8 sm:py-3.5 lg:px-10">
          <a href="#home" className={`flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-black tracking-[0.2em] sm:tracking-[0.25em] ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border backdrop-blur-xl shadow-sm ${isLight ? 'border-sky-200 bg-sky-100/70 text-sky-600' : 'border-cyan-400/30 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'}`}>
              <Camera className={`h-4 w-4 sm:h-5 sm:w-5 ${isLight ? 'text-sky-600' : 'text-cyan-300'}`} />
            </div>
            SNAPDECK
          </a>

          <nav className={`hidden items-center gap-8 text-sm font-semibold md:flex ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <a href="#home" className={`transition ${isLight ? 'hover:text-sky-600 font-bold' : 'hover:text-cyan-300'}`}>Trang chủ</a>
            <a href="#comparison" className={`transition ${isLight ? 'hover:text-sky-600' : 'hover:text-cyan-300'}`}>Vì sao chọn SNAPDECK?</a>
            <a href="#card-themes" className={`transition ${isLight ? 'hover:text-sky-600' : 'hover:text-cyan-300'}`}>6 Chủ Đề Bài</a>
            <button onClick={() => navigate('/how-to-play')} className={`flex items-center gap-1.5 transition ${isLight ? 'hover:text-sky-600' : 'hover:text-cyan-300'}`}>
              <BookOpen className={`h-4 w-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              Cách chơi
            </button>
            <button onClick={() => navigate('/gallery')} className={`transition ${isLight ? 'hover:text-sky-600' : 'hover:text-cyan-300'}`}>Bộ Sưu Tập</button>
            <button onClick={() => navigate('/leaderboard')} className={`transition ${isLight ? 'hover:text-sky-600' : 'hover:text-cyan-300'}`}>Xếp Hạng</button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={toggleSound}
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border backdrop-blur-xl transition ${isLight ? 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 shadow-sm' : 'border-white/15 bg-white/10 text-slate-300 hover:bg-white/20'}`}
              title="Tắt/Mở âm thanh"
            >
              {soundEnabled ? <Volume2 size={18} className={isLight ? 'text-sky-600' : 'text-cyan-300'} /> : <VolumeX size={18} className="text-slate-400" />}
            </button>
          </div>
        </header>

        {/* Main Hero */}
        <main id="home" className="relative z-10 mx-auto flex max-w-7xl flex-col px-4 pb-16 sm:px-8 sm:pb-20 lg:px-10">
          <section className="mx-auto grid w-full max-w-3xl items-center gap-6 pt-2 pb-8 sm:gap-10 sm:pt-3 sm:pb-12 lg:pt-4 lg:pb-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm backdrop-blur-xl shadow-sm ${isLight ? 'border-sky-200 bg-sky-50/95 text-sky-800' : 'border-cyan-500/35 bg-slate-900/90 text-cyan-200'}`}>
                <Zap className="h-4 w-4 text-amber-500 animate-bounce" />
                Board Game Phygital · Xác thực bằng AI hoặc bình chọn nhóm
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className={`text-4xl font-black leading-[1] tracking-tight sm:text-6xl lg:text-7xl flex flex-wrap items-center gap-x-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <span>SNAP</span>
                  <span className={`bg-gradient-to-r ${isLight ? 'from-sky-500 via-teal-500 to-emerald-500' : 'from-cyan-400 via-fuchsia-400 to-amber-300'} bg-clip-text text-transparent`}>
                    DECK
                  </span>
                </h1>
                <p className={`max-w-xl text-base sm:text-lg leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Quét lá bài, hoàn thành thử thách chụp ảnh và cùng nhóm đánh giá.
                </p>
              </div>

              <div className={`rounded-3xl border p-5 backdrop-blur-xl transition-all ${isLight ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-sky-950/5' : 'border-cyan-500/35 bg-slate-900/95 text-slate-100 shadow-2xl shadow-cyan-500/10'}`}>
                <p className={`mb-3 text-xs font-bold uppercase tracking-[0.2em] ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>Chọn cách chơi</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: 'single_device', label: 'Single-device', description: 'Mọi người cùng chơi chung trên một màn hình' },
                    { value: 'multi_device', label: 'Multi-device', description: 'Host tạo phòng và các người chơi vào qua mã/code' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDeviceMode(option.value as 'single_device' | 'multi_device')}
                      className={`rounded-2xl border p-3.5 text-left transition ${deviceMode === option.value ? (isLight ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-cyan-400 bg-cyan-500/15') : (isLight ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-white/10 bg-white/5 hover:bg-white/10')}`}
                    >
                      <div className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{option.label}</div>
                      <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{option.description}</div>
                    </button>
                  ))}
                </div>

                {/* Multi-device AI requirement alert */}
                {deviceMode === 'multi_device' && (
                  <div className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${isLight ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-200'}`}>
                    <Sparkles className={`h-4 w-4 shrink-0 animate-pulse ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                    <span>
                      <strong className={isLight ? 'text-sky-950' : 'text-white'}>Chế độ Multi-device:</strong> Bắt buộc trọng tài AI chấm điểm độc lập để đảm bảo 100% công tâm cho mọi người chơi.
                    </span>
                  </div>
                )}

                {/* Thưởng ảnh +20 XP Card */}
                <div
                  onClick={() => setPhotoBonusEnabled(!photoBonusEnabled)}
                  className={`mt-3 cursor-pointer rounded-2xl border p-3.5 transition-all ${
                    photoBonusEnabled
                      ? (isLight
                          ? 'border-sky-300 bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 shadow-sm text-slate-900'
                          : 'border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-slate-900/80 shadow-lg shadow-fuchsia-500/10 text-white')
                      : (isLight
                          ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          : 'border-white/10 bg-slate-950/60 opacity-70 hover:opacity-100')
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={photoBonusEnabled}
                      onChange={(e) => setPhotoBonusEnabled(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 h-4 w-4 rounded cursor-pointer ${isLight ? 'accent-sky-600' : 'accent-fuchsia-500'}`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          <Camera className={`h-3.5 w-3.5 ${isLight ? 'text-sky-600' : 'text-fuchsia-400'}`} />
                          Thưởng ảnh minh chứng
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm ${isLight ? 'bg-gradient-to-r from-sky-500 to-teal-500' : 'bg-gradient-to-r from-fuchsia-500 to-amber-500'}`}>
                          +20 XP
                        </span>
                        {photoBonusEnabled && (
                          <span className={`text-[10px] font-semibold ml-auto flex items-center gap-1 ${isLight ? 'text-teal-700' : 'text-emerald-400'}`}>
                            <CheckCircle2 size={12} />
                            Đang bật
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Khi chụp ảnh hoàn thành thử thách hợp lệ và được duyệt (bởi AI hoặc nhóm), bạn sẽ nhận ngay <strong className={isLight ? 'text-amber-600' : 'text-amber-300'}>+20 XP thưởng</strong> và bức ảnh này sẽ tự động được lưu vào <strong className={isLight ? 'text-sky-700' : 'text-cyan-300'}>Bộ Sưu Tập kỷ niệm</strong> của nhóm sau trận đấu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 backdrop-blur-xl shadow-xl ${
                isLight
                  ? 'border-amber-200 bg-amber-50/95 text-slate-800 shadow-amber-950/5'
                  : 'border-amber-400/35 bg-slate-900/95 text-slate-100 shadow-black/40'
              }`}>
                <div className="flex items-center gap-2">
                  <QrCode className={`h-4 w-4 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-300'}`} />
                  <p className="text-sm font-black">Chuẩn bị trước khi bắt đầu</p>
                </div>
                <div className="mt-3 grid gap-2 text-xs leading-relaxed sm:grid-cols-2">
                  <div className={`rounded-xl border p-3 ${
                    isLight ? 'border-amber-200 bg-white/95' : 'border-amber-400/20 bg-slate-950/90'
                  }`}>
                    <span className="font-bold">1. Bộ bài SNAPDECK thật</span>
                    <p className={`mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Cần 24 lá bài có mã QR để kích hoạt nhiệm vụ.
                    </p>
                  </div>
                  <div className={`rounded-xl border p-3 ${
                    isLight ? 'border-amber-200 bg-white/95' : 'border-amber-400/20 bg-slate-950/90'
                  }`}>
                    <span className="font-bold">2. Điện thoại có camera</span>
                    <p className={`mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Dùng để quét QR và chụp ảnh bằng chứng cho lượt chơi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { void handleStartGame(); }}
                  disabled={isCreatingRoom}
                  className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 font-bold text-white transition disabled:cursor-wait disabled:opacity-70 sm:min-w-[290px] ${
                    isLight
                      ? 'btn-blue-gradient text-lg shadow-xl shadow-sky-500/25 ring-4 ring-sky-100'
                      : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 shadow-2xl shadow-fuchsia-500/30 ring-2 ring-cyan-300/40 hover:shadow-cyan-500/40'
                  }`}
                >
                  <PlayCircle className="h-6 w-6 transition group-hover:rotate-12" />
                  {isCreatingRoom ? 'Đang tạo phòng...' : deviceMode === 'single_device' ? 'Bắt đầu — đã có bộ bài' : 'Tạo phòng — đã có bộ bài'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleScanQR}
                  className={`inline-flex items-center justify-center gap-3 rounded-2xl border px-7 py-4 font-bold backdrop-blur-xl transition ${
                    isLight
                      ? 'border-sky-300 bg-white text-sky-800 hover:bg-sky-50 shadow-sm'
                      : 'border-cyan-400/35 bg-slate-900/95 text-cyan-200 hover:bg-slate-800 shadow-lg'
                  }`}
                >
                  <QrCode className={`h-6 w-6 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                  Quét QR Tham Gia Phòng
                </motion.button>
              </div>
              {roomError && (
                <p role="alert" className="mx-auto max-w-2xl rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200">
                  {roomError}
                </p>
              )}
            </motion.div>

          </section>

          {/* Comparison Section vs Traditional Games */}
          <section id="comparison" className="py-20 sm:py-28">
            <div className="mb-14 text-center space-y-4">
              <div className="flex justify-center mb-3">
                <span className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-xl ${
                  isLight
                    ? 'border border-sky-300 bg-sky-50 text-sky-700 shadow-sm'
                    : 'border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.2)]'
                }`}>
                  Đột Phá Board Game Năng Động
                </span>
              </div>
              <h2 className={`text-3xl font-black sm:text-4xl lg:text-5xl tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Vì Sao SNAPDECK Vượt Xa UNO, Ma Sói & Truth or Dare?
              </h2>
              <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed pt-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Kết hợp yếu tố vật lý của lá bài và sức mạnh số của WebApp AI, giải quyết triệt để sự chán nản & nghiện điện thoại cá nhân.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* UNO Comparison */}
              <div className={`group rounded-3xl border p-6 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isLight
                  ? 'border-slate-200/90 bg-white/95 shadow-xl shadow-sky-950/5 hover:border-sky-300 hover:shadow-sky-500/10'
                  : 'border-white/15 bg-slate-900/60 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10'
              }`}>
                <div className="space-y-4">
                  <div className={`relative overflow-hidden rounded-2xl border h-48 w-full flex items-center justify-center ${
                    isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-950/80'
                  }`}>
                    <img
                      src={unoCompareImg}
                      alt="Board game UNO"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/80 px-3 py-1 text-xs font-bold text-red-300 backdrop-blur-md">
                      <span>VS UNO</span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                      isLight ? 'text-sky-600' : 'text-cyan-400'
                    }`}>Board game thẻ số</span>
                    <h3 className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>So Với Board Game UNO</h3>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    UNO chỉ ngồi một chỗ đánh bài đơn điệu, dễ cắm cúi vào các con số. <strong className={isLight ? 'text-slate-900 font-semibold' : 'text-white font-semibold'}>SNAPDECK</strong> buộc người chơi phải tương tác hành động thực tế, đứng dậy tạo dáng chụp ảnh kỉ niệm và tạo không khí bùng nổ!
                  </p>
                </div>

                <div className={`mt-5 pt-4 border-t space-y-2 text-[11px] ${
                  isLight ? 'border-slate-100' : 'border-white/10'
                }`}>
                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>UNO:</span>
                    <span className="text-rose-500 font-medium">Ngồi yên một chỗ, đơn điệu</span>
                  </div>
                  <div className={`flex items-center justify-between font-semibold ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}>
                    <span>SNAPDECK:</span>
                    <span className="text-emerald-500">Vận động & bắt trọn cảm xúc thật</span>
                  </div>
                </div>
              </div>

              {/* Ma Soi Comparison */}
              <div className={`group rounded-3xl border p-6 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isLight
                  ? 'border-slate-200/90 bg-white/95 shadow-xl shadow-sky-950/5 hover:border-sky-300 hover:shadow-sky-500/10'
                  : 'border-white/15 bg-slate-900/60 hover:border-fuchsia-500/40 hover:shadow-2xl hover:shadow-fuchsia-500/10'
              }`}>
                <div className="space-y-4">
                  <div className={`relative overflow-hidden rounded-2xl border h-48 w-full flex items-center justify-center ${
                    isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-950/80'
                  }`}>
                    <img
                      src={werewolfCompareImg}
                      alt="Board game Ma Sói Werewolf"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/80 px-3 py-1 text-xs font-bold text-purple-300 backdrop-blur-md">
                      <span>VS Ma Sói</span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                      isLight ? 'text-sky-600' : 'text-fuchsia-400'
                    }`}>Board game ẩn vai</span>
                    <h3 className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>So Với Ma Sói (Werewolf)</h3>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Ma Sói đòi hỏi luật phức tạp, cần quản trò và người bị loại sớm phải ngồi ngoài hàng giờ. <strong className={isLight ? 'text-slate-900 font-semibold' : 'text-white font-semibold'}>SNAPDECK</strong> giữ 100% thành viên tham gia liên tục mọi vòng chơi mà không một ai bị bỏ rơi hay đứng ngoài cuộc!
                  </p>
                </div>

                <div className={`mt-5 pt-4 border-t space-y-2 text-[11px] ${
                  isLight ? 'border-slate-100' : 'border-white/10'
                }`}>
                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Ma Sói:</span>
                    <span className="text-rose-500 font-medium">Cần quản trò, loại sớm ngồi chờ</span>
                  </div>
                  <div className={`flex items-center justify-between font-semibold ${
                    isLight ? 'text-sky-700' : 'text-fuchsia-300'
                  }`}>
                    <span>SNAPDECK:</span>
                    <span className="text-emerald-500">100% gắn kết không ai bị loại</span>
                  </div>
                </div>
              </div>

              {/* Truth or Dare Comparison */}
              <div className={`group rounded-3xl border p-6 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isLight
                  ? 'border-slate-200/90 bg-white/95 shadow-xl shadow-sky-950/5 hover:border-sky-300 hover:shadow-sky-500/10'
                  : 'border-white/15 bg-slate-900/60 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10'
              }`}>
                <div className="space-y-4">
                  <div className={`relative overflow-hidden rounded-2xl border h-48 w-full flex items-center justify-center ${
                    isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-950/80'
                  }`}>
                    <img
                      src={truthOrDareCompareImg}
                      alt="Card game Truth or Dare Dám Nói Dám Làm"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-950/80 px-3 py-1 text-xs font-bold text-pink-300 backdrop-blur-md">
                      <span>VS Truth or Dare</span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                      isLight ? 'text-sky-600' : 'text-amber-400'
                    }`}>Thẻ bài Thật hay Thách</span>
                    <h3 className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>So Với Truth or Dare</h3>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Truth or Dare dễ bị bí ý tưởng và gượng gạo. <strong className={isLight ? 'text-slate-900 font-semibold' : 'text-white font-semibold'}>SNAPDECK</strong> kết hợp thẻ bài, thử thách ảnh, bình chọn nhóm và Vòng Quay Hình Phạt sinh động.
                  </p>
                </div>

                <div className={`mt-5 pt-4 border-t space-y-2 text-[11px] ${
                  isLight ? 'border-slate-100' : 'border-white/10'
                }`}>
                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Truth or Dare:</span>
                    <span className="text-rose-500 font-medium">Dễ gượng gạo, bí câu hỏi</span>
                  </div>
                  <div className={`flex items-center justify-between font-semibold ${
                    isLight ? 'text-sky-700' : 'text-amber-300'
                  }`}>
                    <span>SNAPDECK:</span>
                    <span className="text-emerald-500">Bình chọn nhóm & Vòng quay phạt số</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6 Theme Cards Showcase - 2 Rows x 3 Cards */}
          <ThemeCardsShowcase isLight={isLight} />

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
                    className={`rounded-[2rem] border p-6 shadow-xl backdrop-blur-xl ${
                      isLight
                        ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/5'
                        : 'border-white/15 bg-slate-900/90 text-white shadow-xl'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isLight
                        ? 'bg-gradient-to-br from-sky-100 to-emerald-100 text-emerald-600 border border-emerald-200/60'
                        : 'bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-cyan-200'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className={`mt-5 text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{card.title}</h3>
                    <p className={`mt-3 text-sm leading-6 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{card.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </section>

          {/* Flow Steps */}
          <section id="how-it-works" className="py-16">
            <div className="mb-10 text-center">
              <span className={`text-xs font-bold uppercase tracking-widest ${
                isLight ? 'text-sky-600' : 'text-cyan-400'
              }`}>Luồng Hoạt Động Phygital</span>
              <h2 className={`mt-2 text-3xl font-black sm:text-4xl ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>Cẩm Nang Cách Chơi Trong 4 Bước</h2>
              <p className={`mt-2 text-sm max-w-xl mx-auto ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Hướng dẫn nhanh cho người chơi khi quét mã QR từ bao bì hộp bài vật lý
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className={`relative flex flex-col justify-between rounded-[1.75rem] border p-6 text-left backdrop-blur-xl transition ${
                    isLight
                      ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-sky-950/5 hover:border-sky-300'
                      : 'border-white/15 bg-slate-900/90 text-white hover:border-cyan-400/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-white text-base ${
                        isLight
                          ? 'btn-blue-gradient shadow-md'
                          : 'bg-gradient-to-br from-violet-500 to-cyan-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isLight
                          ? 'bg-sky-50 border border-sky-200 text-sky-700'
                          : 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300'
                      }`}>
                        {step.tag}
                      </span>
                    </div>
                    <h3 className={`mt-4 text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{step.title}</h3>
                    <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <button
                onClick={() => navigate('/how-to-play')}
                className={`group inline-flex items-center gap-3 rounded-2xl px-8 py-4 font-bold shadow-xl backdrop-blur-xl transition hover:scale-105 ${
                  isLight
                    ? 'btn-blue-gradient text-white shadow-sky-500/25 hover:shadow-sky-500/35'
                    : 'border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-violet-500/20 text-white shadow-cyan-500/20 hover:border-cyan-300 hover:shadow-cyan-500/40'
                }`}
              >
                <BookOpen className={`h-5 w-5 transition group-hover:rotate-6 ${isLight ? 'text-white' : 'text-cyan-300'}`} />
                <span>Xem Cẩm Nang Hướng Dẫn Chi Tiết</span>
                <ArrowRight className={`h-5 w-5 transition group-hover:translate-x-1 ${isLight ? 'text-white' : 'text-cyan-400'}`} />
              </button>
            </div>
          </section>
        </main>

        <footer className={`relative z-10 border-t px-6 py-8 backdrop-blur-xl ${
          isLight
            ? 'border-slate-200/80 bg-white/80 text-slate-600'
            : 'border-white/10 bg-slate-950/60 text-slate-400'
        }`}>
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <p className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>SNAPDECK — Phygital Party Game Platform</p>
            <div className="flex items-center gap-4">
              <button onClick={handleAdmin} className={`font-bold hover:underline ${
                isLight ? 'text-sky-600' : 'text-cyan-400'
              }`}>
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
