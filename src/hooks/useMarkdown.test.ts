import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as markdownLib from '../lib/markdown';
import { useMarkdown } from './useMarkdown';

describe('useMarkdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns render() output after the debounce window', () => {
    const { result } = renderHook(() => useMarkdown('# Hello', { debounceMs: 60 }));

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.html).toBe(markdownLib.render('# Hello'));
    expect(result.current.isStale).toBe(false);
  });

  it('strips <script> tags — no unsanitized HTML reaches output', () => {
    const payload = '<script>alert(1)</script>';
    const { result } = renderHook(() => useMarkdown(payload, { debounceMs: 60 }));

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.html).not.toContain('<script>');
    expect(result.current.html).not.toContain('alert(1)');
  });

  it('coalesces rapid successive updates — render is called only once', () => {
    const renderSpy = vi.spyOn(markdownLib, 'render');

    const { result, rerender } = renderHook(
      ({ md }: { md: string }) => useMarkdown(md, { debounceMs: 60 }),
      { initialProps: { md: 'first' } },
    );

    renderSpy.mockClear();

    act(() => {
      rerender({ md: 'second' });
      rerender({ md: 'third' });
      rerender({ md: 'fourth' });
    });

    expect(renderSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(result.current.html).toBe(markdownLib.render('fourth'));
  });

  it('isStale is true while debounce timer is pending and false after it fires', () => {
    const { result, rerender } = renderHook(
      ({ md }: { md: string }) => useMarkdown(md, { debounceMs: 60 }),
      { initialProps: { md: 'initial' } },
    );

    expect(result.current.isStale).toBe(false);

    act(() => {
      rerender({ md: 'changed' });
    });

    expect(result.current.isStale).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.isStale).toBe(false);
  });

  it('preserves previous html while a debounce timer is pending', () => {
    const { result, rerender } = renderHook(
      ({ md }: { md: string }) => useMarkdown(md, { debounceMs: 60 }),
      { initialProps: { md: '# First' } },
    );

    const firstHtml = result.current.html;

    act(() => {
      rerender({ md: '# Second' });
    });

    expect(result.current.html).toBe(firstHtml);
    expect(result.current.isStale).toBe(true);
  });

  it('clears pending timer on unmount — no state update after unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ md }: { md: string }) => useMarkdown(md, { debounceMs: 60 }),
      { initialProps: { md: 'before' } },
    );

    act(() => {
      rerender({ md: 'after unmount' });
    });

    expect(result.current.isStale).toBe(true);

    unmount();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(60);
      });
    }).not.toThrow();
  });
});
