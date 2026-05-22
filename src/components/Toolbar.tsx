import type { Theme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';

type ToolbarProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-theme-border bg-theme-bg">
      <span className="font-semibold text-sm tracking-wide">MarkView</span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}

export default Toolbar;
