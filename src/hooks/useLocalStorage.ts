import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

function readFromStorage(key: string, initialValue: string): string {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage(
  key: string,
  initialValue: string,
): [string, (next: string) => void] {
  const [value, setValueState] = useState<string>(() =>
    readFromStorage(key, initialValue),
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  const setValue = useCallback((next: string) => {
    setValueState(next);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      try {
        localStorage.setItem(keyRef.current, next);
      } catch {
        // QuotaExceededError or storage unavailable — in-memory value stays intact
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return [value, setValue];
}
