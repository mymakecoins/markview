import type { RefObject } from 'react';

type EditorPaneProps = {
  value: string;
  onChange: (v: string) => void;
  editorRef: RefObject<HTMLTextAreaElement>;
  onScroll: () => void;
};

function EditorPane({ value, onChange, editorRef, onScroll }: EditorPaneProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 border-r border-theme-border">
      <textarea
        ref={editorRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={onScroll}
        spellCheck={false}
        placeholder="Type Markdown here…"
        className="flex-1 resize-none outline-none p-4 font-mono text-sm leading-relaxed bg-theme-bg text-theme-text placeholder:text-theme-border"
      />
    </div>
  );
}

export default EditorPane;
