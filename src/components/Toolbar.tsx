import type { Theme } from '../hooks/useTheme';
import OpenFileButton from './OpenFileButton';
import ThemeToggle from './ThemeToggle';

type ToolbarProps = {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenFile: () => void;
  fileLoading?: boolean;
};

function Toolbar({ theme, onToggleTheme, onOpenFile, fileLoading }: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-theme-border bg-theme-bg">
      <span className="font-semibold text-sm tracking-wide">MarkView</span>
      <div className="flex items-center gap-1">
        <OpenFileButton onClick={onOpenFile} disabled={fileLoading} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

export default Toolbar;
