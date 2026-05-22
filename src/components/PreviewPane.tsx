import type { RefObject } from 'react';

type PreviewPaneProps = {
  html: string;
  previewRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
};

function PreviewPane({ html, previewRef, onScroll }: PreviewPaneProps) {
  return (
    <div
      className="markdown-body"
      ref={previewRef}
      onScroll={onScroll}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default PreviewPane;
