import { useEffect, useRef, useState } from 'react';
import { Music2, VolumeX } from 'lucide-react';

const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const audio = new Audio(
      `${import.meta.env.BASE_URL}audio/nhacgame.mp3`
    );

    audio.loop = true;
    audio.volume = volume / 100;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (enabled) {
      audio.pause();
      setEnabled(false);
      return;
    }

    try {
      await audio.play();
      setEnabled(true);
    } catch (error) {
      console.error('Không thể phát nhạc nền:', error);
      setEnabled(false);
    }
  };

return (
  <div className="fixed bottom-5 right-5 z-[100]">
    <div className="relative flex flex-col items-end gap-2">
      {showControls && (
        <div className="w-56 rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-3 shadow-xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">
              Nhạc nền
            </span>
            <span className="text-xs text-slate-400">
              {volume}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-full accent-cyan-400"
            aria-label="Âm lượng nhạc nền"
          />

          <button
            type="button"
            onClick={() => void toggleMusic()}
            className="mt-3 w-full rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            {enabled ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowControls((prev) => !prev)}
        aria-label="Mở cài đặt nhạc nền"
        aria-expanded={showControls}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/90 text-cyan-300 shadow-lg shadow-cyan-950/40 backdrop-blur-xl transition hover:scale-105 hover:bg-slate-900"
      >
        {enabled ? <Music2 size={20} /> : <VolumeX size={20} />}
      </button>
    </div>
  </div>
);
};

export default BackgroundMusic;