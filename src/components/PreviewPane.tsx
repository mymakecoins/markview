import type { RefObject } from 'react';

type PreviewPaneProps = {
  html: string;
  previewRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
};

function PreviewPane({ html, previewRef, onScroll }: PreviewPaneProps) {
  return (
    <div
      className="markdown-body flex-1 overflow-y-auto min-w-0 p-6"
      ref={previewRef}
      onScroll={onScroll}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default PreviewPane;
