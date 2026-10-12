import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Layers, QrCode, Sparkles, Zap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { DECK_CARDS, type PhysicalCard } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';

const ScanQRPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRound, setActiveCard } = useGame();

  // If user clicked "Quét QR Tham Gia Phòng" from Home page -> Camera Only mode
  const isFromHomeScan = location.state?.fromHomeScan ?? false;

  const [mode, setMode] = useState<'camera' | 'deck'>(isFromHomeScan ? 'camera' : 'deck');
  const [scanning, setScanning] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Flow 2: Card selection (after Host prepared Lobby)
  const handleSelectCard = (card: PhysicalCard) => {
    sound.playCardFlip();
    setSelectedCardId(card.id);
    setActiveCard(card);
    setScanning(true);

    setTimeout(() => {
      sound.playScanBeep();
      navigate('/challenge', {
        state: { round: currentRound },
      });
    }, 1500);
  };

  // Flow 1: Quick QR scan from Home page -> Joins Lobby with room code!
  const handleScanRoomQRFromHome = () => {
    sound.playScanBeep();
    setScanning(true);

    setTimeout(() => {
      navigate('/lobby', {
        state: { joinedFromQR: true, roomCode: 'ROOM-8899' },
      });
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            sound.playClick();
            navigate('/');
          }}
          className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
        >
          <ArrowLeft size={18} />
          Trang chủ
        </button>

        <div className="my-auto py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300">
                  <Sparkles size={14} className="animate-spin text-cyan-400" />
                  Mô Hình Phygital: Lá Bài Thật + WebApp
                </span>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {isFromHomeScan ? 'Quét Mã QR Tham Gia Phòng' : 'Quét & Chọn Lá Bài Thử Thách'}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {isFromHomeScan
                    ? 'Bật Camera quét mã QR để gia nhập sảnh phòng chơi cùng bạn bè!'
                    : `Vòng ${currentRound} — Quét mã QR trên bài vật lý 24 lá để bắt đầu!`
                  }
                </p>
              </div>

              {/* Mode Switcher (Only if not in strict Home Camera scan mode) */}
              {!isFromHomeScan && (
                <div className="flex rounded-2xl border border-white/15 bg-slate-950 p-1.5">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setMode('deck');
                    }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${mode === 'deck'
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Layers size={16} />
                    Bộ Bài 3D (Pitch Demo)
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setMode('camera');
                    }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${mode === 'camera'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Camera size={16} />
                    Ống Kính Camera
                  </button>
                </div>
              )}
            </div>

            {/* Mode 1: Home Camera Only QR Scanner View */}
            {mode === 'camera' && (
              <div className="space-y-6 text-center">
                <div className="relative mx-auto flex h-72 w-full max-w-md items-center justify-center overflow-hidden rounded-3xl border-2 border-cyan-400/40 bg-slate-950/80 shadow-2xl">
                  <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border-4 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                    <QrCode size={100} className="text-cyan-300 animate-pulse" />
                  </div>

                  {/* Scanning Sci-Fi Line */}
                  <motion.div
                    animate={{ y: [-130, 130, -130] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-8 right-8 h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={isFromHomeScan ? handleScanRoomQRFromHome : () => handleSelectCard(DECK_CARDS[0])}
                  className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 font-bold text-white shadow-xl shadow-fuchsia-500/20"
                >
                  {scanning
                    ? 'Đang Giải Mã QR...'
                    : isFromHomeScan
                      ? 'Bật Camera & Quét Mã QR Phòng'
                      : 'Kích Hoạt Quét QR Bài Thật'
                  }
                </motion.button>
              </div>
            )}

            {/* Mode 2: 3D Physical Deck Picker (Host Flow) */}
            {mode === 'deck' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chọn 1 lá bài từ Bộ Bài 24 Lá (Hoặc rút bài thật và chạm chọn):
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DECK_CARDS.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    return (
                      <motion.div
                        key={card.id}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelectCard(card)}
                        className={`cursor-pointer rounded-2xl border p-5 transition backdrop-blur-xl relative overflow-hidden ${isSelected
                            ? 'border-cyan-400 bg-gradient-to-br from-cyan-950/80 to-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.4)] ring-2 ring-cyan-400'
                            : 'border-white/15 bg-slate-950/60 hover:border-cyan-500/40 hover:bg-white/10'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-cyan-400">{card.code}</span>
                          <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                            {card.category}
                          </span>
                        </div>

                        <div className="mt-3 text-lg font-bold text-white">{card.title}</div>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{card.mission}</p>

                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                          <span className="text-amber-400 font-bold">{'⭐'.repeat(card.difficulty)}</span>
                          <span className="text-emerald-400 font-bold">+{card.xp} XP</span>
                        </div>

                        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-300">
                          <QrCode size={14} /> CHỌN RÚT BÀI NÀY
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scanning Status */}
            {scanning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center space-y-1">
                <p className="text-cyan-300 font-bold text-base flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 animate-bounce text-amber-400" />
                  {isFromHomeScan
                    ? 'Đã nhận diện mã phòng ROOM-8899! Đang chuyển vào Phòng Chờ...'
                    : 'Đã quét mã QR thành công! Đang giải mã bài thử thách...'
                  }
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;