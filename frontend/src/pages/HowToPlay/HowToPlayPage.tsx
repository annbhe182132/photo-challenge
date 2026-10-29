import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Lightbulb,
} from 'lucide-react';
import { useGame } from '../../context/useGame';
import { apiRequest } from '../../services/api';
import type { Player } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';
import ThemeToggle from '../../components/ThemeToggle';

interface CreatedRoomResponse {
  success: boolean;
  data?: {
    roomCode?: string;
    players?: Player[];
  };
  playerToken?: string;
  message?: string;
}

interface StepDetail {
  number: string;
  badge: string;
  title: string;
  subtitle: string;
  points: { title: string; desc: string }[];
  accentColor: string;
  phoneContent: {
    screenTitle: string;
    stage: 'connect' | 'card_timer' | 'camera_action' | 'ai_verify' | 'reward_punish';
  };
}

const stepsData: StepDetail[] = [
  {
    number: '01',
    badge: 'KẾT NỐI & VÀO PHÒNG',
    title: 'Vào Game & Chọn Cách Chơi',
    subtitle: 'Mở trình duyệt điện thoại là chơi ngay, hoàn toàn không cần tải hay cài đặt ứng dụng!',
    accentColor: 'from-cyan-500 to-blue-500',
    points: [
      {
        title: 'Quét QR trên vỏ hộp bài',
        desc: 'Mở camera điện thoại quét mã QR in trên hộp SNAPDECK để mở WebApp tức thì.',
      },
      {
        title: 'Single-device (1 Điện thoại)',
        desc: 'Cả nhóm ngồi quây quần và chuyền tay nhau 1 điện thoại làm màn hình chính.',
      },
      {
        title: 'Multi-device (Nhiều Điện thoại)',
        desc: 'Host tạo phòng, mỗi người dùng điện thoại riêng quét QR hoặc nhập mã PIN tham gia.',
      },
    ],
    phoneContent: {
      screenTitle: 'Sảnh Chờ Phòng Chơi',
      stage: 'connect',
    },
  },
  {
    number: '02',
    badge: 'THẺ BÀI THẬT & ĐỒNG HỒ',
    title: 'Rút Thẻ Bài & Kích Hoạt Timer',
    subtitle: 'Rút 1 trong 24 lá bài thử thách độc quyền và đối mặt với đồng hồ đếm ngược nghẹt thở!',
    accentColor: 'from-amber-400 to-orange-500',
    points: [
      {
        title: 'Rút 1 lá bài vật lý trên bàn',
        desc: 'Mỗi lượt chơi, người chơi rút 1 lá bài thật bất kỳ từ bộ 24 thẻ trong hộp.',
      },
      {
        title: 'Quét QR trên lá bài',
        desc: 'Đưa camera quét mã QR in trên thẻ bài thật để kích hoạt nhiệm vụ trên màn hình.',
      },
      {
        title: 'Timer đếm ngược tức thì (15s - 60s)',
        desc: 'Đồng hồ đếm ngược kích hoạt với âm thanh hồi hộp, thôi thúc người chơi hành động ngay!',
      },
    ],
    phoneContent: {
      screenTitle: 'Nhiệm Vụ & Đồng Hồ Đếm Ngược',
      stage: 'card_timer',
    },
  },
  {
    number: '03',
    badge: 'TẠO DÁNG & MINH CHỨNG',
    title: 'Thực Hiện Thử Thách & Chụp Ảnh',
    subtitle: 'Bùng nổ biểu cảm, tạo dáng hài hước cùng bạn bè và bấm chụp trước khi chuông reo!',
    accentColor: 'from-fuchsia-500 to-pink-500',
    points: [
      {
        title: 'Tạo dáng đúng yêu cầu thẻ bài',
        desc: 'Tự mình thực hiện hoặc lôi kéo đồng bọn diễn xuất, tạo dáng khó đỡ nhất có thể.',
      },
      {
        title: 'Chụp ảnh trước khi hết giờ (0s)',
        desc: 'Nhấn nút chụp nhanh trên màn hình để ghi lại bằng chứng minh xác cho lượt chơi.',
      },
      {
        title: 'Ảnh minh chứng thực tế',
        desc: 'Bức ảnh chụp trực tiếp sẽ được dùng cho AI chấm điểm và lưu vào bộ sưu tập kỷ niệm.',
      },
    ],
    phoneContent: {
      screenTitle: 'Khung Ngắm Chụp Ảnh',
      stage: 'camera_action',
    },
  },
  {
    number: '04',
    badge: 'AI VISION CHẤM ĐIỂM',
    title: 'AI Chếck Độc Lập Chấm Điểm',
    subtitle: 'Trọng tài AI Vision phân tích ảnh, tính tỷ lệ khớp tư thế và nhận xét siêu công tâm!',
    accentColor: 'from-violet-500 to-cyan-400',
    points: [
      {
        title: 'Quét ảnh bằng AI Chếck',
        desc: 'Hệ thống AI nhận diện khuôn mặt, tư thế và đối chiếu với tiêu chí của thẻ bài.',
      },
      {
        title: 'Chấm Match Score (%) & Nhận xét',
        desc: 'AI tính tỷ lệ khớp tư thế, đưa ra số điểm xứng đáng kèm lời nhận xét hóm hỉnh.',
      },
      {
        title: 'Bắt buộc trong Multi-device',
        desc: 'Chế độ nhiều máy luôn sử dụng Trọng tài AI độc lập để đảm bảo 100% khách quan.',
      },
    ],
    phoneContent: {
      screenTitle: 'AI Đang Phân Tích...',
      stage: 'ai_verify',
    },
  },
  {
    number: '05',
    badge: 'THƯỞNG XP & VÒNG QUAY PHẠT',
    title: 'Thưởng Điểm, Kỷ Niệm & Hình Phạt 🌶️',
    subtitle: 'Thành công nhận điểm + thưởng ảnh; thất bại chấp nhận quay Vòng Quay Hình Phạt!',
    accentColor: 'from-emerald-400 to-teal-500',
    points: [
      {
        title: 'Thành công: Nhận XP + Thưởng ảnh +20 XP',
        desc: 'Vượt qua thử thách sẽ được cộng điểm và bức ảnh được lưu vào Album kỷ niệm của nhóm.',
      },
      {
        title: 'Thất bại hoặc hết giờ: Vòng Quay Phạt 🌶️',
        desc: 'Quay số ngẫu nhiên các hình phạt lầy lội (uống nước, làm thơ, đóng băng 1 phút...).',
      },
      {
        title: 'Vinh danh Leaderboard & Tải Album',
        desc: 'Kết thúc ván chơi, bảng xếp hạng tôn vinh quán quân và album ảnh lưu lại toàn bộ kỷ niệm.',
      },
    ],
    phoneContent: {
      screenTitle: 'Tổng Kết & Vòng Quay Phạt',
      stage: 'reward_punish',
    },
  },
];

const HowToPlayPage = () => {
  const navigate = useNavigate();
  const {
    soundEnabled,
    toggleSound,
    setDeviceMode,
    themeMode,
    theme,
    mode,
    photoBonusEnabled,
    turnDurationSeconds,
    totalRounds,
    setRoomCode,
    setPlayers,
    setCurrentPlayerId,
    setRoomPlayerToken,
    setCurrentRound,
    setTotalRounds,
    beginLocalGame,
  } = useGame();
  const isLight = themeMode === 'light';
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('multi');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const handleStartGame = async (selectedMode: 'single_device' | 'multi_device') => {
    if (isCreatingRoom) return;
    sound.playClick();
    setDeviceMode(selectedMode);
    setRoomError(null);

    if (selectedMode === 'single_device') {
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
      return;
    }

    setIsCreatingRoom(true);
    try {
      const response = await apiRequest<CreatedRoomResponse>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.id,
          mode,
          deviceMode: 'multi_device',
          verificationMethod: 'ai',
          photoBonusEnabled,
          turnDurationSeconds,
          totalRounds,
          hostName: 'Host',
        }),
      });
      if (
        response.success !== true ||
        !response.data?.roomCode ||
        !Array.isArray(response.data.players) ||
        typeof response.playerToken !== 'string'
      ) {
        throw new Error(response.message || 'Máy chủ không xác nhận được phòng mới.');
      }
      setRoomCode(response.data.roomCode);
      setPlayers(response.data.players);
      setCurrentPlayerId(response.data.players[0]?.id ?? null);
      setRoomPlayerToken(response.playerToken);
      setCurrentRound(1);
      sound.playSuccess();
      navigate('/lobby', { state: { isHost: true } });
    } catch (error) {
      setRoomError(
        error instanceof Error
          ? error.message
          : 'Không thể tạo phòng chơi. Vui lòng kiểm tra kết nối và thử lại.'
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isLight ? 'text-slate-900' : 'text-slate-100'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b px-4 py-3.5 backdrop-blur-xl sm:px-8 ${
        isLight
          ? 'border-slate-200/80 bg-white/80'
          : 'border-white/10 bg-slate-950/80'
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Trang chủ</span>
            </button>
            <div className={`hidden h-5 w-px sm:block ${isLight ? 'bg-slate-200' : 'bg-white/20'}`} />
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                isLight
                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                  : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-300'
              }`}>
                <Camera className="h-4 w-4" />
              </div>
              <span className={`text-sm font-black tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>
                SNAPDECK
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={toggleSound}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                  : 'border-white/15 bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
              title="Tắt/Mở âm thanh"
            >
              {soundEnabled ? (
                <Volume2 size={16} className={isLight ? 'text-sky-600' : 'text-cyan-300'} />
              ) : (
                <VolumeX size={16} className={isLight ? 'text-slate-400' : 'text-slate-500'} />
              )}
            </button>
            <button
              onClick={() => handleStartGame('multi_device')}
              className={`hidden items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-95 sm:inline-flex ${
                isLight
                  ? 'btn-blue-gradient shadow-md shadow-sky-500/20'
                  : 'bg-gradient-to-r from-violet-600 to-cyan-500 shadow-lg shadow-cyan-500/20'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              <span>Chơi ngay</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-xl ${
          isLight
            ? 'border-sky-300 bg-sky-50 text-sky-700'
            : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
        }`}>
          <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
          Hiểu cách chơi trong 30 giây
        </div>

        <h1 className={`mt-4 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Luật Chơi <span className="bg-gradient-to-r from-sky-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">SNAPDECK</span>
        </h1>
        <p className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${
          isLight ? 'text-slate-600' : 'text-slate-300'
        }`}>
          Trò chơi tiệc tùng kết hợp hoàn hảo giữa <strong className={isLight ? 'text-slate-900' : 'text-white'}>24 Thẻ bài vật lý cầm tay</strong> và <strong className={isLight ? 'text-sky-700 font-bold' : 'text-cyan-300'}>Trợ lý ảo AI Vision</strong> trên điện thoại. Không cần tải app, mở trình duyệt là bắt đầu ngay!
        </p>

        <div className={`mx-auto mt-7 max-w-4xl overflow-hidden rounded-3xl border p-4 text-left shadow-xl sm:p-5 ${
          isLight
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 text-slate-900 shadow-amber-500/10'
            : 'border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-cyan-500/10 text-white'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-slate-950">30s</span>
              <div>
                <p className="text-sm font-black">Ví dụ trọn vẹn một lượt của Linh</p>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Cần bộ bài SNAPDECK thật và điện thoại có camera.</p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
              isLight ? 'border-amber-300 bg-white text-amber-800' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
            }`}>Lá SD-CARD-007</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              ['1', 'Rút & quét', 'Linh rút lá 07 rồi quét QR in trên lá.'],
              ['2', 'Nhận nhiệm vụ', 'Màn hình hiện: tạo dáng runway cùng một bạn.'],
              ['3', 'Chụp bằng chứng', 'Linh và Mai vào khung hình, chụp trước khi hết 24 giây.'],
              ['4', 'Nhận kết quả', 'AI chấm khớp 92% → đạt, cộng XP và lưu ảnh.'],
            ].map(([number, title, description]) => (
              <div key={number} className={`rounded-2xl border p-3 ${
                isLight ? 'border-slate-200 bg-white/90' : 'border-white/10 bg-slate-950/50'
              }`}>
                <span className="text-xs font-black text-amber-500">0{number}</span>
                <p className="mt-1 text-xs font-black">{title}</p>
                <p className={`mt-1 text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Specs */}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`rounded-2xl border p-3.5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Users className="mx-auto h-5 w-5 text-sky-600" />
            <div className={`mt-2 text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>2 - 8+ Người</div>
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Số lượng người chơi</div>
          </div>
          <div className={`rounded-2xl border p-3.5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Clock className="mx-auto h-5 w-5 text-amber-500" />
            <div className={`mt-2 text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>15 - 30 Phút</div>
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Thời lượng mỗi ván</div>
          </div>
          <div className={`rounded-2xl border p-3.5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Smartphone className="mx-auto h-5 w-5 text-emerald-600" />
            <div className={`mt-2 text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>1 Hoặc Nhiều Máy</div>
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Single & Multi-device</div>
          </div>
          <div className={`rounded-2xl border p-3.5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Brain className="mx-auto h-5 w-5 text-teal-600" />
            <div className={`mt-2 text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Trọng Tài AI Chếck</div>
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chấm điểm khách quan</div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className={`mx-auto mt-12 max-w-xl rounded-2xl border p-1.5 backdrop-blur-xl ${
          isLight
            ? 'border-slate-200 bg-white shadow-sm'
            : 'border-white/15 bg-slate-950/70'
        }`}>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('multi');
              }}
              className={`rounded-xl py-3 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'multi'
                  ? isLight
                    ? 'btn-blue-gradient text-white shadow-md'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Chế độ Multi-device (Nhiều máy)</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('single');
              }}
              className={`rounded-xl py-3 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'single'
                  ? isLight
                    ? 'btn-emerald-gradient text-white shadow-md'
                    : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Chế độ Single-device (1 máy)</span>
            </button>
          </div>
          <div className={`p-3 text-center text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {activeTab === 'multi' ? (
              <span className={`flex items-center justify-center gap-1.5 ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <strong>Multi-device:</strong> Mỗi người 1 điện thoại kết nối qua mã PIN. <strong>Bắt buộc chấm bằng AI Chếck</strong> để đảm bảo 100% công tâm!
              </span>
            ) : (
              <span className={isLight ? 'text-emerald-800' : 'text-fuchsia-300'}>
                <strong>Single-device:</strong> Cả nhóm ngồi chung chuyền tay 1 điện thoại. Có thể chọn Trọng tài AI hoặc cả bàn cùng bỏ phiếu biểu quyết.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 5 Core Steps with Realistic Smartphone Mockups */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-16 sm:space-y-24">
          {stepsData.map((step, index) => {
            const isEven = index % 2 === 1;
            return (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-12 ${
                  isEven ? 'lg:grid-flow-dense' : ''
                }`}
              >
                {/* Text Content Column */}
                <div className={`space-y-5 lg:col-span-7 ${isEven ? 'lg:col-start-6' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accentColor} text-base font-black text-slate-950 shadow-md`}>
                      {step.number}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
                      isLight
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-white/15 bg-white/5 text-cyan-300'
                    }`}>
                      {step.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className={`text-2xl font-black sm:text-3xl lg:text-4xl ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {step.title}
                    </h2>
                    <p className={`mt-2 text-sm leading-relaxed sm:text-base ${
                      isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}>
                      {step.subtitle}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {step.points.map((pt, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 rounded-2xl border p-3.5 backdrop-blur-xl transition ${
                          isLight
                            ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm hover:border-sky-300'
                            : 'border-white/10 bg-slate-900/60 text-white hover:border-white/20'
                        }`}
                      >
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isLight ? 'text-emerald-600' : 'text-cyan-400'}`} />
                        <div>
                          <div className={`text-xs font-bold sm:text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{pt.title}</div>
                          <div className={`mt-0.5 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{pt.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Smartphone Mockup Column */}
                <div className={`lg:col-span-5 ${isEven ? 'lg:col-start-1' : ''}`}>
                  <div className="relative mx-auto flex justify-center">
                    {/* Glowing background aura */}
                    <div className={`absolute -inset-4 rounded-full bg-gradient-to-r ${step.accentColor} opacity-20 blur-2xl`} />

                    {/* Realistic Smartphone Frame */}
                    <div className={`relative w-full max-w-[280px] sm:max-w-[300px] rounded-[3rem] border-[4px] p-3 shadow-2xl ${
                      isLight
                        ? 'border-slate-300 bg-slate-900 shadow-slate-400/30 ring-1 ring-slate-200'
                        : 'border-slate-700/80 bg-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(34,211,238,0.25)] ring-1 ring-white/20'
                    }`}>
                      {/* Phone Hardware Details */}
                      <div className="absolute left-[-6px] top-24 h-8 w-[3px] rounded-l-sm bg-slate-600" />
                      <div className="absolute left-[-6px] top-36 h-8 w-[3px] rounded-l-sm bg-slate-600" />
                      <div className="absolute right-[-6px] top-28 h-12 w-[3px] rounded-r-sm bg-slate-600" />

                      {/* Phone Screen Area */}
                      <div className="relative h-[530px] w-full overflow-hidden rounded-[2.25rem] bg-slate-900 border border-white/10 flex flex-col justify-between text-slate-100 select-none">
                        {/* Dynamic Island / Notch */}
                        <div className="relative z-20 mx-auto mt-2 h-5 w-24 rounded-full bg-black flex items-center justify-between px-2.5">
                          <div className="h-2 w-2 rounded-full bg-slate-800" />
                          <div className="h-1.5 w-1.5 rounded-full bg-cyan-500/60" />
                        </div>

                        {/* Status Bar */}
                        <div className="relative z-10 flex items-center justify-between px-5 pt-1 text-[10px] font-semibold text-slate-400">
                          <span>09:41</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px]">5G</span>
                            <div className="h-2 w-3.5 rounded-sm border border-slate-400 p-0.5 flex items-center">
                              <div className="h-full w-2.5 bg-emerald-400 rounded-[1px]" />
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Screen Content Based on Step */}
                        <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-hidden">
                          {renderPhoneScreen(step.phoneContent.stage)}
                        </div>

                        {/* Home Indicator Bar */}
                        <div className="mx-auto mb-1.5 h-1 w-28 rounded-full bg-white/30" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Game rules and recovery paths */}
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-4 sm:px-6 sm:pb-10">
        <div className={`rounded-[2rem] border p-5 sm:p-8 ${
          isLight ? 'border-sky-200 bg-white/90 shadow-lg shadow-sky-950/5' : 'border-cyan-400/20 bg-slate-900/70'
        }`}>
          <div className="text-center">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${
              isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-500/10 text-cyan-300'
            }`}>
              <ShieldCheck className="h-3.5 w-3.5" /> LUẬT NHANH CẦN BIẾT
            </span>
            <h2 className={`mt-3 text-2xl font-black sm:text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Tính điểm, kết thúc ván và khi AI chưa nhận diện được
            </h2>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: 'Khi nào được điểm?',
                desc: 'AI đạt từ 50% trở lên, hoặc lượt được nhóm duyệt. Điểm kết quả gồm điểm cơ bản và các thưởng hợp lệ.',
              },
              {
                icon: Camera,
                title: 'Ảnh thưởng thế nào?',
                desc: 'Khi bật Thưởng ảnh và có ảnh bằng chứng hợp lệ, điểm thưởng ảnh được cộng vào tổng XP.',
              },
              {
                icon: Crown,
                title: 'Khi nào hết ván?',
                desc: 'Mỗi người hoàn thành đủ lượt của số vòng đã chọn thì hệ thống mở bảng xếp hạng. Chế độ không giới hạn do nhóm tự dừng.',
              },
              {
                icon: Brain,
                title: 'AI chưa nhận diện?',
                desc: 'Giữ ảnh rõ, đủ sáng và chụp lại nếu cần rồi thử lại. Chơi một máy có thể chuyển sang bình chọn nhóm; nhiều máy cần AI xác minh.',
              },
            ].map((rule) => {
              const Icon = rule.icon;
              return (
                <div key={rule.title} className={`rounded-2xl border p-4 ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'
                }`}>
                  <Icon className={`h-5 w-5 ${isLight ? 'text-sky-600' : 'text-cyan-300'}`} />
                  <h3 className={`mt-3 text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{rule.title}</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{rule.desc}</p>
                </div>
              );
            })}
          </div>
          <p className={`mt-4 text-center text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Không đạt, hết giờ hoặc bỏ lượt sẽ không bị trừ XP; nhóm chỉ thực hiện hình phạt vui nếu đã chọn chế độ Spicy.
          </p>
        </div>
      </section>

      {/* Penalty Wheel Spotlight */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 sm:p-12 shadow-2xl backdrop-blur-xl ${
          isLight
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 shadow-amber-500/10'
            : 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950 shadow-amber-500/10'
        }`}>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative z-10 grid items-center gap-8 md:grid-cols-12">
            <div className="md:col-span-8 space-y-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                isLight
                  ? 'border-amber-300 bg-amber-100 text-amber-900'
                  : 'border-amber-400/40 bg-amber-500/15 text-amber-300'
              }`}>
                <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                VÒNG QUAY HÌNH PHẠT 🌶️
              </span>
              <h2 className={`text-2xl font-black sm:text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Không Qua Thử Thách? Đừng Lo, Càng Thua Càng Vui!
              </h2>
              <p className={`text-xs leading-relaxed sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Nếu không kịp chụp ảnh hoặc bị AI / bạn bè từ chối duyệt, người chơi sẽ bấm quay <strong>Vòng Quay Hình Phạt</strong> trên màn hình. Các hình phạt nhẹ nhàng, hài hước và an toàn (như làm thơ tỏ tình, uống 1 ngụm nước, đóng băng 1 phút...) đảm bảo mang lại tiếng cười bùng nổ cho cả bàn tiệc.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-amber-400/60 bg-amber-500/20 text-4xl shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-spin" style={{ animationDuration: '15s' }}>
                🎡
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Tips Section */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h3 className={`text-center text-xl font-bold sm:text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
          💡 Bí Quyết Để Có Trận Đấu Bùng Nổ Nhất
        </h3>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className={`rounded-2xl border p-5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Sparkles className="h-6 w-6 text-fuchsia-500" />
            <h4 className={`mt-3 text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Bật Thưởng Ảnh +20 XP</h4>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Khuyến khích tất cả mọi người chụp ảnh để gom đủ một album kỷ niệm sau khi kết thúc ván chơi.
            </p>
          </div>
          <div className={`rounded-2xl border p-5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Volume2 className="h-6 w-6 text-sky-600" />
            <h4 className={`mt-3 text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Bật Âm Thanh Sci-Fi</h4>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Hiệu ứng âm thanh đếm ngược tick-tock và nhạc nền hồi hộp sẽ đẩy adrenaline cả bàn lên đỉnh điểm.
            </p>
          </div>
          <div className={`rounded-2xl border p-5 backdrop-blur-xl ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sm'
              : 'border-white/10 bg-slate-900/60 text-white'
          }`}>
            <Crown className="h-6 w-6 text-amber-500" />
            <h4 className={`mt-3 text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Biểu Cảm Hết Cỡ</h4>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Càng nhập tâm, tạo dáng lố và biểu cảm cường điệu, AI Vision càng cho điểm sáng tạo cao!
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <footer className={`border-t px-4 py-12 text-center backdrop-blur-xl sm:px-6 ${
        isLight
          ? 'border-slate-200/80 bg-white/80'
          : 'border-white/10 bg-slate-950/80'
      }`}>
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className={`text-2xl font-black sm:text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Bạn Đã Sẵn Sàng Nhập Cuộc SNAPDECK?
          </h2>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Rút ngay một lá bài vật lý, quét mã và bắt đầu những tràng cười thả ga cùng nhóm bạn!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => { void handleStartGame('multi_device'); }}
              disabled={isCreatingRoom}
              className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white transition hover:scale-105 disabled:cursor-wait disabled:opacity-70 ${
                isLight
                  ? 'btn-blue-gradient shadow-xl shadow-sky-500/25'
                  : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 shadow-xl shadow-cyan-500/25'
              }`}
            >
              <PlayCircle className="h-5 w-5" />
              <span>{isCreatingRoom ? 'Đang tạo phòng...' : 'Tạo phòng Multi-device (Có AI)'}</span>
            </button>
            <button
              onClick={() => { void handleStartGame('single_device'); }}
              disabled={isCreatingRoom}
              className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-bold backdrop-blur-xl transition hover:scale-105 disabled:opacity-70 ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Users className={`h-5 w-5 ${isLight ? 'text-sky-600' : 'text-cyan-300'}`} />
              <span>Chơi chung 1 máy (Single)</span>
            </button>
          </div>
          {roomError && (
            <p role="alert" className="mx-auto max-w-xl rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-xs sm:text-sm font-semibold text-red-300">
              {roomError}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

// Helper renderer for phone screens
function renderPhoneScreen(stage: StepDetail['phoneContent']['stage']) {
  switch (stage) {
    case 'connect':
      return (
        <div className="flex h-full flex-col justify-between space-y-2">
          <div className="text-center">
            <span className="text-[10px] font-black tracking-widest text-cyan-400">SNAPDECK</span>
            <div className="mt-1 text-xs font-black text-white">CHỌN CÁCH CHƠI</div>
          </div>
          <div className="space-y-1.5">
            <div className="rounded-xl border border-cyan-400 bg-cyan-500/20 p-2 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>Multi-device</span>
                <span className="rounded bg-cyan-400 px-1 py-0.2 text-[8px] text-slate-950 font-black">CHỌN</span>
              </div>
              <div className="text-[9px] text-slate-300">Host tạo phòng & nhập mã PIN</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-left opacity-60">
              <div className="text-[11px] font-bold text-white">Single-device</div>
              <div className="text-[9px] text-slate-300">Chơi chung 1 màn hình</div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/80 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Mã Phòng Chơi</div>
            <div className="text-sm font-black tracking-widest text-cyan-300">ROOM-8899</div>
            <div className="mt-1 flex justify-center gap-1 text-[9px] text-slate-300">
              <span>👑 Host</span> · <span>⚡ Ken</span> · <span>🌸 Vy</span>
            </div>
          </div>
          <button className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2 text-[11px] font-bold text-white shadow-md">
            Tạo phòng & Bắt đầu
          </button>
        </div>
      );

    case 'card_timer':
      return (
        <div className="flex h-full flex-col justify-between space-y-2 text-center">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>VÒNG 1/5</span>
            <span className="text-cyan-400">LƯỢT CỦA BẠN</span>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent p-2.5">
            <div className="text-[8px] font-bold uppercase tracking-wider text-amber-300">LÁ BÀI SỐ 07</div>
            <div className="mt-1 text-xs font-black text-white">Tạo Dáng Siêu Mẫu Runway</div>
            <div className="mt-1 text-[9px] text-slate-300">Bước đi thần thái và pose dáng kết màn!</div>
          </div>

          {/* Glowing Timer Circle */}
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400/30 bg-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <div className="absolute inset-1 rounded-full border-2 border-dashed border-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="text-center">
              <div className="text-xl font-black text-amber-300">24s</div>
              <div className="text-[8px] font-bold uppercase text-slate-400">Còn Lại</div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/80 px-2 py-1 text-[9px] text-slate-300">
            📸 Chuẩn bị máy chụp ảnh minh chứng!
          </div>
        </div>
      );

    case 'camera_action':
      return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-cyan-400/40 bg-slate-950 p-2 text-center">
          {/* Viewfinder brackets */}
          <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-cyan-400" />
          <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-400" />
          <div className="absolute bottom-10 left-2 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-10 right-2 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />

          {/* Mission Overlay */}
          <div className="relative z-10 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-[8px] font-bold text-cyan-300">Nhiệm Vụ: Pose dáng Runway</span>
          </div>

          {/* Mock Camera Silhouette */}
          <div className="my-auto flex flex-col items-center justify-center opacity-75">
            <div className="text-3xl">💃🕺</div>
            <div className="mt-1 text-[9px] font-semibold text-slate-300">Cả nhóm cùng vào khung hình!</div>
          </div>

          {/* Shutter Controls */}
          <div className="relative z-10 flex items-center justify-around pt-1">
            <div className="h-6 w-6 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-[10px]">
              🔄
            </div>
            {/* Shutter Button */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-fuchsia-500 to-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
              <Camera size={16} className="text-white" />
            </div>
            <div className="h-6 w-6 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-[10px]">
              ⚡
            </div>
          </div>
        </div>
      );

    case 'ai_verify':
      return (
        <div className="flex h-full flex-col justify-between space-y-2 text-center">
          <div className="inline-flex items-center justify-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
            <Brain size={11} />
            <span>AI CHẾCK VISION JUDGE</span>
          </div>

          {/* AI Scan Mockup */}
          <div className="relative mx-auto h-28 w-36 overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950 p-2 flex items-center justify-center">
            {/* Laser scanning beam */}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
            <div className="text-3xl">📸 ✨</div>
          </div>

          {/* Match Score Card */}
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300">
              <span>Độ Khớp Tư Thế:</span>
              <span className="text-xs font-black">92% ĐẠT CHUẨN</span>
            </div>
            <div className="mt-1 text-[8px] text-slate-300 leading-tight">
              &quot;Tư thế runway chuẩn mẫu, thần thái tự tin 10/10! Duyệt thử thách.&quot;
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-1.5 text-[10px] font-black text-slate-950 shadow-md">
            ✅ DUYỆT THỬ THÁCH (+50 XP)
          </div>
        </div>
      );

    case 'reward_punish':
      return (
        <div className="flex h-full flex-col justify-between space-y-1.5 text-center">
          <div className="text-2xl animate-bounce">🎉</div>
          <div>
            <div className="text-xs font-black text-emerald-400">THỬ THÁCH THÀNH CÔNG!</div>
            <div className="text-[9px] text-slate-300">Chúc mừng bạn đã ghi điểm!</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-[9px]">
              <span className="text-slate-300">Điểm thử thách:</span>
              <span className="font-bold text-amber-300">+50 XP</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[9px]">
              <span className="text-fuchsia-300 flex items-center gap-1">📸 Thưởng ảnh:</span>
              <span className="font-black text-fuchsia-300">+20 XP (Đã Lưu)</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-[8px] text-amber-200 text-left">
            <span>🌶️ <strong>Nếu thất bại:</strong> Quay Vòng Quay Hình Phạt để chọn thử thách bựa!</span>
          </div>

          <button className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-1.5 text-[10px] font-bold text-white">
            Tiếp tục ván chơi ➔
          </button>
        </div>
      );
  }
}

export default HowToPlayPage;
