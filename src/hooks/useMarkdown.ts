import { useEffect, useRef, useState } from 'react';

import { render } from '../lib/markdown';

export type RenderResult = {
  html: string;
  isStale: boolean;
};

const DEFAULT_DEBOUNCE_MS = 60;

export function useMarkdown(
  markdown: string,
  options?: { debounceMs?: number },
): RenderResult {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const [result, setResult] = useState<RenderResult>(() => ({
    html: render(markdown),
    isStale: false,
  }));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const debounceRef = useRef(debounceMs);
  debounceRef.current = debounceMs;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setResult((prev) => ({ html: prev.html, isStale: true }));

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setResult({ html: render(markdown), isStale: false });
    }, debounceRef.current);
  }, [markdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return result;
}
