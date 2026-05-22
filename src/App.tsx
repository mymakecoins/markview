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
    <div>
      <Toolbar theme={theme} onToggleTheme={toggleTheme} />
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
  );
}

export default App;
