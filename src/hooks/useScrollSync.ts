import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

type SyncState = {
  isSyncing: boolean;
  rafId: number | null;
};

export function useScrollSync(
  editorRef: RefObject<HTMLElement | null>,
  previewRef: RefObject<HTMLElement | null>,
): {
  onEditorScroll: () => void;
  onPreviewScroll: () => void;
} {
  const syncState = useRef<SyncState>({ isSyncing: false, rafId: null });

  useEffect(() => {
    return () => {
      if (syncState.current.rafId !== null) {
        cancelAnimationFrame(syncState.current.rafId);
        syncState.current.rafId = null;
      }
    };
  }, []);

  function createScrollHandler(
    srcRef: RefObject<HTMLElement | null>,
    targetRef: RefObject<HTMLElement | null>,
  ): () => void {
    return () => {
      const state = syncState.current;

      if (state.isSyncing) {
        return;
      }

      const src = srcRef.current;
      const target = targetRef.current;
      if (src === null || target === null) {
        return;
      }

      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }

      state.isSyncing = true;

      state.rafId = requestAnimationFrame(() => {
        state.rafId = null;

        const srcScrollable = src.scrollHeight - src.clientHeight;
        if (srcScrollable === 0) {
          state.isSyncing = false;
          return;
        }

        const ratio = src.scrollTop / srcScrollable;
        const targetScrollable = target.scrollHeight - target.clientHeight;
        target.scrollTop = ratio * targetScrollable;

        // Clear the guard on the next tick so the echo scroll event fired by the
        // line above has already been dispatched and ignored before we lower the flag.
        requestAnimationFrame(() => {
          state.isSyncing = false;
        });
      });
    };
  }

  const handlersRef = useRef<{
    onEditorScroll: () => void;
    onPreviewScroll: () => void;
  } | null>(null);

  if (handlersRef.current === null) {
    handlersRef.current = {
      onEditorScroll: createScrollHandler(editorRef, previewRef),
      onPreviewScroll: createScrollHandler(previewRef, editorRef),
    };
  }

  return handlersRef.current;
}
