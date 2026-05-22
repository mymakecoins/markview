import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('returns initialValue when key is not in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns stored value when key is pre-seeded in localStorage', () => {
    localStorage.setItem('test-key', 'stored');
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates in-memory value immediately on setValue', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    act(() => {
      result.current[1]('hello');
    });
    expect(result.current[0]).toBe('hello');
  });

  it('writes to localStorage after the debounce window (fake timers)', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    act(() => {
      result.current[1]('persisted');
    });
    expect(localStorage.getItem('test-key')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(localStorage.getItem('test-key')).toBe('persisted');
  });

  it('does not write to localStorage before the debounce window', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    act(() => {
      result.current[1]('early');
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('debounces rapid calls — only the last value is written', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    act(() => {
      result.current[1]('first');
      result.current[1]('second');
      result.current[1]('last');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(localStorage.getItem('test-key')).toBe('last');
  });

  it('does not throw when setItem throws QuotaExceededError; in-memory value stays correct', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    expect(() => {
      act(() => {
        result.current[1]('big-value');
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }).not.toThrow();

    expect(result.current[0]).toBe('big-value');
  });

  it('returns initialValue and does not crash when getItem throws (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage is disabled');
    });

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'fallback'),
    );

    expect(result.current[0]).toBe('fallback');
  });

  it('clears pending timer on unmount — no write after unmount', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result, unmount } = renderHook(() =>
      useLocalStorage('test-key', ''),
    );

    act(() => {
      result.current[1]('pending');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
