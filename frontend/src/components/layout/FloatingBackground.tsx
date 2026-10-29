import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Camera, Bot, Users, Sparkles, Zap, Trophy, Flame, QrCode, Smile, Beer } from 'lucide-react';
import { useGame } from '../../context/useGame';

interface FloatingBackgroundProps {
  showActions?: boolean;
}

// 10 actions floating in background with depth, soft blur, and outer gutter positions
const FLOATING_ACTIONS = [
  {
    id: 1,
    icon: Camera,
    text: 'Tạo dáng siêu mẫu',
    tag: 'Thử thách',
    left: '2%',
    top: '14%',
    duration: 16,
    delay: 0,
    gradient: 'from-sky-400 via-sky-500 to-blue-600',
    scale: 0.92,
    opacity: 0.85,
    mobileVisible: true,
  },
  {
    id: 2,
    icon: Bot,
    text: 'AI Chếck chấm điểm',
    tag: 'AI Judge',
    left: '80%',
    top: '14%',
    duration: 18,
    delay: 1.2,
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    scale: 0.95,
    opacity: 0.9,
    mobileVisible: true,
  },
  {
    id: 3,
    icon: Users,
    text: 'Cả bàn cùng bỏ phiếu',
    tag: 'Group Vote',
    left: '1.5%',
    top: '54%',
    duration: 20,
    delay: 2.4,
    gradient: 'from-sky-300 via-blue-400 to-blue-600',
    scale: 0.88,
    opacity: 0.8,
    mobileVisible: false,
  },
  {
    id: 4,
    icon: Zap,
    text: 'Speedrun 15 giây',
    tag: 'Tốc độ',
    left: '83%',
    top: '58%',
    duration: 17,
    delay: 0.8,
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    scale: 0.92,
    opacity: 0.85,
    mobileVisible: false,
  },
  {
    id: 5,
    icon: QrCode,
    text: 'Quét mã QR lá bài',
    tag: 'Phygital',
    left: '2.5%',
    top: '84%',
    duration: 19,
    delay: 3.1,
    gradient: 'from-blue-400 via-blue-500 to-sky-600',
    scale: 0.88,
    opacity: 0.8,
    mobileVisible: true,
  },
  {
    id: 6,
    icon: Flame,
    text: 'Vòng quay hình phạt',
    tag: 'Spicy 🌶️',
    left: '79%',
    top: '86%',
    duration: 21,
    delay: 1.9,
    gradient: 'from-blue-600 via-indigo-600 to-blue-800',
    scale: 0.9,
    opacity: 0.85,
    mobileVisible: true,
  },
  {
    id: 7,
    icon: Trophy,
    text: '+100 XP Thần thái',
    tag: 'Điểm thưởng',
    left: '14%',
    top: '74%',
    duration: 22,
    delay: 3.5,
    gradient: 'from-sky-400 via-blue-500 to-blue-700',
    scale: 0.86,
    opacity: 0.75,
    mobileVisible: false,
  },
  {
    id: 8,
    icon: Sparkles,
    text: 'Khoảnh khắc bùng nổ',
    tag: 'Party King',
    left: '64%',
    top: '91%',
    duration: 20,
    delay: 2.7,
    gradient: 'from-cyan-400 via-sky-400 to-blue-500',
    scale: 0.86,
    opacity: 0.75,
    mobileVisible: false,
  },
  {
    id: 9,
    icon: Smile,
    text: 'Diễn sâu 100%',
    tag: 'Showtime',
    left: '85%',
    top: '36%',
    duration: 23,
    delay: 1.5,
    gradient: 'from-sky-300 via-sky-500 to-blue-600',
    scale: 0.85,
    opacity: 0.75,
    mobileVisible: false,
  },
  {
    id: 10,
    icon: Beer,
    text: 'Cạn ly cùng hội bạn',
    tag: 'Cheers 🍻',
    left: '1.5%',
    top: '34%',
    duration: 24,
    delay: 2.2,
    gradient: 'from-blue-400 via-blue-600 to-indigo-600',
    scale: 0.85,
    opacity: 0.75,
    mobileVisible: false,
  },
];

const FloatingBackground = ({ showActions = true }: FloatingBackgroundProps) => {
  const { themeMode } = useGame();
  const location = useLocation();
  const isLight = themeMode === 'light';
  const isHomePage = location.pathname === '/';
  const [scrollRatio, setScrollRatio] = useState(0);

  useEffect(() => {
    if (!isHomePage) return undefined;
    const updateScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      // Ramp smoothly from 0 at top of Hero (y <= 60px) to 1 when scrolled down (y >= 480px)
      const normalized = Math.min(1, Math.max(0, (y - 60) / 420));
      setScrollRatio(normalized);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, [isHomePage]);

  // At top of Home (scrollRatio = 0): dimmed by ~75% (opacity 0.25, blur 2px).
  // As user scrolls down (scrollRatio -> 1): transitions from mờ 70% (0.30) -> mờ 30% (0.70 max).
  const homeActionOpacity = 0.25 + scrollRatio * 0.45;
  const homeActionBlur = (1 - scrollRatio) * 2;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-colors duration-300 ${
        isLight
          ? 'bg-gradient-to-br from-slate-50 via-sky-50/50 to-emerald-50/40'
          : 'bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)]'
      }`}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isHomePage ? 'opacity-100' : 'opacity-50 blur-[1px]'
        }`}
      >
        {/* Ambient Gradient Depth Orbs matching Sky & Ocean Blue Palette in Light, or Cyberpunk Neon in Dark */}
        {isLight ? (
          <>
            <motion.div
              className="absolute -left-28 -top-16 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-sky-300/30 via-sky-400/20 to-blue-500/15 blur-3xl"
              animate={{ y: [0, 40, 0], x: [0, 30, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -right-28 top-20 h-[36rem] w-[36rem] rounded-full bg-gradient-to-bl from-blue-600/25 via-sky-400/20 to-transparent blur-3xl"
              animate={{ y: [0, -45, 0], x: [0, -35, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-5 left-1/4 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-sky-400/20 via-emerald-400/15 to-transparent blur-3xl"
              animate={{ y: [0, 35, 0], x: [0, -25, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Subtle geometric squircle accents floating in background with depth */}
            <motion.div
              className="absolute left-[18%] top-[25%] h-14 w-14 rounded-3xl bg-gradient-to-br from-sky-300/40 to-blue-500/30 shadow-md backdrop-blur-xs"
              animate={{ y: [0, -25, 0], rotate: [0, 15, 0], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[16%] top-[45%] h-16 w-16 rounded-3xl bg-gradient-to-bl from-blue-400/35 to-indigo-600/30 shadow-md backdrop-blur-xs"
              animate={{ y: [0, 30, 0], rotate: [0, -20, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
          </>
        ) : (
          <>
            <motion.div
              className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl"
              animate={{ y: [0, 24, 0], x: [0, 18, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-0 top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
              animate={{ y: [0, -28, 0], x: [0, -20, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl"
              animate={{ y: [0, 20, 0], x: [0, 16, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute left-[18%] top-[25%] h-14 w-14 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-md backdrop-blur-xs border border-white/5"
              animate={{ y: [0, -25, 0], rotate: [0, 15, 0], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[16%] top-[45%] h-16 w-16 rounded-3xl bg-gradient-to-bl from-fuchsia-500/20 to-indigo-600/20 shadow-md backdrop-blur-xs border border-white/5"
              animate={{ y: [0, 30, 0], rotate: [0, -20, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
          </>
        )}

        {/* Floating Action Cards: dimmed at top of Homepage (mờ ~75%), fading in on scroll from mờ 70% -> mờ 30% */}
        {showActions && isHomePage && (
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: homeActionOpacity,
              filter: homeActionBlur > 0.1 ? `blur(${homeActionBlur.toFixed(2)}px)` : undefined,
            }}
          >
            {FLOATING_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  style={{
                    left: item.left,
                    top: item.top,
                    transform: `scale(${item.scale})`,
                    opacity: item.opacity,
                  }}
                  className={`absolute transition-all ${
                    item.mobileVisible ? 'block' : 'hidden md:block'
                  }`}
                  animate={{
                    y: [0, -24, 0],
                    x: [0, item.id % 2 === 0 ? 14 : -14, 0],
                    rotate: [0, item.id % 2 === 0 ? 2.5 : -2.5, 0],
                  }}
                  transition={{
                    duration: item.duration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: item.delay,
                  }}
                >
                  <div
                    className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-all ${
                      isLight
                        ? 'border border-sky-200/90 bg-white/90 shadow-sky-900/10'
                        : 'border border-cyan-400/35 bg-slate-900/85 shadow-cyan-500/15'
                    }`}
                  >
                    {/* Squircle gradient icon container matching reference image */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md shadow-sky-500/25`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <span
                        className={`block text-[9px] font-black uppercase tracking-wider ${
                          isLight ? 'text-sky-600' : 'text-cyan-400'
                        }`}
                      >
                        {item.tag}
                      </span>
                      <span
                        className={`block text-xs font-bold whitespace-nowrap ${
                          isLight ? 'text-slate-800' : 'text-slate-100'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingBackground;
