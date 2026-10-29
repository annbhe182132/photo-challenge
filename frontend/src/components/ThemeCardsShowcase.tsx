import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Hand } from 'lucide-react';
import { sound } from '../utils/soundEngine';

import cardFrontPose from '../assets/cards/card_front_solo_pose.png';
import cardFrontActing from '../assets/cards/card_front_solo_acting.png';
import cardFrontInteraction from '../assets/cards/card_front_interaction.png';
import cardFrontCreative from '../assets/cards/card_front_creative.png';
import cardFrontExpression from '../assets/cards/card_front_expression.png';
import cardFrontSpeed from '../assets/cards/card_front_speed.png';

import cardBackPose from '../assets/cards/card_back_solo_pose.png';
import cardBackActing from '../assets/cards/card_back_solo_acting.png';
import cardBackInteraction from '../assets/cards/card_back_interaction.png';
import cardBackCreative from '../assets/cards/card_back_creative.png';
import cardBackExpression from '../assets/cards/card_back_expression.png';
import cardBackSpeed from '../assets/cards/card_back_speed.png';

interface PhysicalCardItem {
  id: string;
  themeIndex: number;
  themeName: string;
  challengeTitle: string;
  frontImage: string;
  backImage: string;
  glowColor: string;
  backColorName: string;
}

const PHYSICAL_CARDS: PhysicalCardItem[] = [
  { id: 'theme-solo-pose', themeIndex: 1, themeName: 'Tạo Dáng', challengeTitle: 'Bất Trọng Lực', frontImage: cardFrontPose, backImage: cardBackPose, glowColor: 'rgba(123,61,38,0.45)', backColorName: 'Mặt lưng màu nâu' },
  { id: 'theme-solo-acting', themeIndex: 2, themeName: 'Nhập Vai', challengeTitle: 'Phản Ứng Trúng Số', frontImage: cardFrontActing, backImage: cardBackActing, glowColor: 'rgba(16,77,57,0.45)', backColorName: 'Mặt lưng màu xanh lá' },
  { id: 'theme-interaction', themeIndex: 3, themeName: 'Tương Tác', challengeTitle: 'Nhìn Vào Mắt', frontImage: cardFrontInteraction, backImage: cardBackInteraction, glowColor: 'rgba(238,142,59,0.45)', backColorName: 'Mặt lưng màu cam' },
  { id: 'theme-creative', themeIndex: 4, themeName: 'Sáng Tạo', challengeTitle: 'Quán Quân Biến Hóa', frontImage: cardFrontCreative, backImage: cardBackCreative, glowColor: 'rgba(222,56,121,0.45)', backColorName: 'Mặt lưng màu hồng' },
  { id: 'theme-expression', themeIndex: 5, themeName: 'Thần Thái', challengeTitle: 'Mặt Lạnh Như Băng', frontImage: cardFrontExpression, backImage: cardBackExpression, glowColor: 'rgba(130,200,229,0.45)', backColorName: 'Mặt lưng màu xanh nhạt' },
  { id: 'theme-speed', themeIndex: 6, themeName: 'Tốc Độ', challengeTitle: 'Thần Thái 3 Giây', frontImage: cardFrontSpeed, backImage: cardBackSpeed, glowColor: 'rgba(25,32,74,0.55)', backColorName: 'Mặt lưng màu xanh đậm' },
];

interface ThemeCardsShowcaseProps { isLight?: boolean; }

export const ThemeCardsShowcase: React.FC<ThemeCardsShowcaseProps> = ({ isLight = false }) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [canHover, setCanHover] = useState(() => (
    typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  ));

  useEffect(() => {
    // Chỉ kích hoạt hiệu ứng hover nếu thiết bị có chuột (pointer fine), vô hiệu hóa trên màn hình cảm ứng để vuốt siêu mượt
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const toggleFlip = (cardId: string) => {
    try { sound.playCardFlip(); } catch { /* safe fallback */ }
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <section id="card-themes" className="relative py-16 sm:py-24">
      {/* Background glow tối ưu kích thước cho mobile */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 h-[320px] sm:h-[500px] w-[320px] sm:w-[700px] lg:w-[1000px] rounded-full blur-2xl sm:blur-3xl opacity-20 sm:opacity-25 ${isLight ? 'bg-gradient-to-r from-amber-200 via-sky-200 to-rose-200' : 'bg-gradient-to-r from-amber-600/30 via-cyan-600/20 to-fuchsia-600/30'}`} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center space-y-4">
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-xl ${isLight ? 'border border-amber-300 bg-amber-50 text-amber-800 shadow-sm' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'}`}>
              <Sparkles className="h-4 w-4 text-amber-400 animate-spin-slow" />
              Bộ Bài Vật Lý SNAPDECK — 6 Chủ Đề Chính
            </span>
          </div>
          <h2 className={`text-3xl font-black sm:text-4xl lg:text-5xl tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Trải Nghiệm Cầm Lá Bài Thật Trên Tay
          </h2>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Chạm vào từng lá bài để lật xem mặt trước và mặt sau với mã QR WebApp
          </p>
          <div className="flex items-center justify-center pt-1 text-xs">
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border ${isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-300 border-white/10'}`}>
              <Hand className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Chạm vào lá bài để lật mặt trước / mặt sau
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {PHYSICAL_CARDS.map((card, index) => {
            const isFlipped = !!flippedCards[card.id];
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="flex justify-center"
              >
                <div
                  className="w-full max-w-[340px] sm:max-w-[360px] aspect-[486/758] select-none cursor-pointer touch-pan-y"
                  style={{ perspective: '1200px' }}
                  onClick={() => toggleFlip(card.id)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={canHover ? { scale: 1.035, y: -8 } : undefined}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    {/* Mặt trước */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        position: 'absolute',
                        inset: 0,
                        boxShadow: `0 14px 32px -6px ${card.glowColor}, 0 0 0 1px rgba(255,255,255,0.18) inset`,
                        transform: 'translateZ(0)'
                      }}
                      className="rounded-[1.75rem] overflow-hidden border-[3px] border-white/20 bg-slate-900"
                    >
                      <img
                        src={card.frontImage}
                        alt={card.themeName}
                        className="w-full h-full object-cover rounded-[1.6rem] block pointer-events-none select-none"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent pointer-events-none" />
                    </div>

                    {/* Mặt sau */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) translateZ(0)',
                        position: 'absolute',
                        inset: 0,
                        boxShadow: `0 14px 32px -6px ${card.glowColor}, 0 0 0 1px rgba(255,255,255,0.18) inset`
                      }}
                      className="rounded-[1.75rem] overflow-hidden border-[3px] border-white/20 bg-slate-950"
                    >
                      <img
                        src={card.backImage}
                        alt={`Mặt sau lá bài ${card.themeName}`}
                        className="w-full h-full object-cover rounded-[1.6rem] block pointer-events-none select-none"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent pointer-events-none" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default ThemeCardsShowcase;
