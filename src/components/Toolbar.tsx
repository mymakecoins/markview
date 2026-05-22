import type { Theme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';

type ToolbarProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  return (
    <header>
      <span>MarkView</span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}

export default Toolbar;
