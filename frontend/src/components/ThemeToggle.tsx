import { Sun, Moon } from 'lucide-react';
import { useGame } from '../context/useGame';
import { sound } from '../utils/soundEngine';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle = ({ className = '', showLabel = false }: ThemeToggleProps) => {
  const { themeMode, toggleThemeMode } = useGame();
  const isLight = themeMode === 'light';

  const handleToggle = () => {
    sound.playClick();
    toggleThemeMode();
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center gap-2 rounded-2xl border transition backdrop-blur-xl shadow-sm ${
        isLight
          ? 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 shadow-slate-200/50'
          : 'border-white/15 bg-white/10 text-amber-300 hover:bg-white/20'
      } ${showLabel ? 'px-3.5 py-2' : 'h-9 w-9 sm:h-10 sm:w-10'} ${className}`}
      title={isLight ? 'Chuyển sang Giao diện Tối (Dark mode)' : 'Chuyển sang Giao diện Sáng (Light mode)'}
      aria-label="Toggle Dark / Light Mode"
    >
      {isLight ? (
        <Moon size={18} className="text-slate-700 transition hover:rotate-12" />
      ) : (
        <Sun size={18} className="text-amber-400 transition hover:rotate-45" />
      )}
      {showLabel && (
        <span className="text-xs font-bold">
          {isLight ? 'Giao diện Tối' : 'Giao diện Sáng'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
