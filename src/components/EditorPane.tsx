import type { RefObject } from 'react';

type EditorPaneProps = {
  value: string;
  onChange: (v: string) => void;
  editorRef: RefObject<HTMLTextAreaElement>;
  onScroll: () => void;
};

function EditorPane({ value, onChange, editorRef, onScroll }: EditorPaneProps) {
  return (
    <textarea
      ref={editorRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onScroll={onScroll}
      spellCheck={false}
    />
  );
}

export default EditorPane;
