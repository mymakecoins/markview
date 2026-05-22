import { useRef } from 'react';

import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import Toolbar from './components/Toolbar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMarkdown } from './hooks/useMarkdown';
import { useScrollSync } from './hooks/useScrollSync';
import { useTheme } from './hooks/useTheme';

function App() {
  const [markdown, setMarkdown] = useLocalStorage('markview:content', '');
  const { theme, toggleTheme } = useTheme();
  const { html } = useMarkdown(markdown);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { onEditorScroll, onPreviewScroll } = useScrollSync(editorRef, previewRef);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-theme-bg text-theme-text">
      <Toolbar theme={theme} onToggleTheme={toggleTheme} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <EditorPane
          value={markdown}
          onChange={setMarkdown}
          editorRef={editorRef}
          onScroll={onEditorScroll}
        />
        <PreviewPane
          html={html}
          previewRef={previewRef}
          onScroll={onPreviewScroll}
        />
      </div>
    </div>
  );
}

export default App;
