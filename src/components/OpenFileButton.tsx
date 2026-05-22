type OpenFileButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

function OpenFileButton({ onClick, disabled }: OpenFileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Open Markdown file"
      title="Open file"
      className="p-1.5 rounded-md text-base leading-none hover:bg-theme-code-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
    >
      📂
    </button>
  );
}

export default OpenFileButton;
