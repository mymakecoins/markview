import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';

import { useScrollSync } from './useScrollSync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEl(scrollTop: number, scrollHeight: number, clientHeight: number): HTMLDivElement {
  const el = document.createElement('div');
  let _scrollTop = scrollTop;
  Object.defineProperties(el, {
    scrollTop: {
      get() { return _scrollTop; },
      set(v: number) { _scrollTop = v; },
      configurable: true,
    },
    scrollHeight: { get() { return scrollHeight; }, configurable: true },
    clientHeight: { get() { return clientHeight; }, configurable: true },
  });
  return el;
}

function makeRef<T extends HTMLElement>(el: T): RefObject<T | null> {
  return { current: el };
}

// ---------------------------------------------------------------------------
// rAF mock helpers
// ---------------------------------------------------------------------------

type RafCallback = (time: number) => void;

function setupRafMock() {
  let id = 0;
  const pending = new Map<number, RafCallback>();

  const raf = vi.fn((cb: RafCallback): number => {
    const handle = ++id;
    pending.set(handle, cb);
    return handle;
  });

  const caf = vi.fn((handle: number): void => {
    pending.delete(handle);
  });

  function flush() {
    const current = [...pending.entries()];
    current.forEach(([handle, cb]) => {
      pending.delete(handle);
      cb(performance.now());
    });
  }

  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);

  return { flush, pending, raf, caf };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useScrollSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('proportional scroll mapping', () => {
    it('scrolling editor to 50% sets preview scrollTop to ~50% of its scrollable range', () => {
      const { flush } = setupRafMock();

      const editorEl = makeEl(50, 200, 100);
      const previewEl = makeEl(0, 400, 100);

      const { result } = renderHook(() =>
        useScrollSync(makeRef(editorEl), makeRef(previewEl)),
      );

      result.current.onEditorScroll();
      flush(); // outer rAF — writes scrollTop
      flush(); // inner rAF — clears isSyncing

      // editor: 50 / (200-100) = 50%; preview: 50% * (400-100) = 150
      expect(previewEl.scrollTop).toBe(150);
    });

    it('scrolling preview to 25% sets editor scrollTop to ~25% of its scrollable range', () => {
      const { flush } = setupRafMock();

      const previewEl = makeEl(50, 300, 100);
      const editorEl = makeEl(0, 500, 100);

      const { result } = renderHook(() =>
        useScrollSync(makeRef(editorEl), makeRef(previewEl)),
      );

      result.current.onPreviewScroll();
      flush();
      flush();

      // preview: 50 / (300-100) = 25%; editor: 25% * (500-100) = 100
      expect(editorEl.scrollTop).toBe(100);
    });
  });

  describe('isSyncing guard — no infinite echo loop', () => {
    it('does not schedule a second rAF when the echo scroll fires during isSyncing', () => {
      const { flush, raf } = setupRafMock();

      const editorEl = makeEl(50, 200, 100);
      const previewEl = makeEl(0, 400, 100);

      const editorRef = makeRef(editorEl);
      const previewRef = makeRef(previewEl);

      const { result } = renderHook(() => useScrollSync(editorRef, previewRef));

      let writeCount = 0;
      Object.defineProperty(previewEl, 'scrollTop', {
        get() { return 0; },
        set(_v: number) {
          writeCount++;
          // Simulate echo: browser fires preview's scroll event synchronously after write.
          result.current.onPreviewScroll();
        },
        configurable: true,
      });

      result.current.onEditorScroll(); // schedules rAF #1
      const rafCountBeforeFlush = raf.mock.calls.length;
      flush(); // outer rAF fires — writes scrollTop, echo fires onPreviewScroll
      flush(); // inner rAF fires — clears isSyncing

      // Only one write occurred.
      expect(writeCount).toBe(1);
      // The echo's onPreviewScroll was swallowed — no extra rAF was scheduled for it.
      // rAF calls: 1 (outer) + 1 (inner clear) = 2 total from the first onEditorScroll.
      expect(raf.mock.calls.length).toBe(rafCountBeforeFlush + 1); // +1 for the inner clear rAF
    });
  });

  describe('zero React re-renders', () => {
    it('causes no re-renders when scroll handlers are invoked', () => {
      const { flush } = setupRafMock();

      const editorEl = makeEl(50, 200, 100);
      const previewEl = makeEl(0, 400, 100);

      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useScrollSync(makeRef(editorEl), makeRef(previewEl));
      });

      const renderCountAfterMount = renderCount;

      result.current.onEditorScroll();
      flush();
      flush();

      result.current.onPreviewScroll();
      flush();
      flush();

      expect(renderCount).toBe(renderCountAfterMount);
    });
  });

  describe('requestAnimationFrame cancellation on unmount', () => {
    it('cancels an in-flight rAF on unmount', () => {
      const { caf, pending } = setupRafMock();

      const editorEl = makeEl(50, 200, 100);
      const previewEl = makeEl(0, 400, 100);

      const { result, unmount } = renderHook(() =>
        useScrollSync(makeRef(editorEl), makeRef(previewEl)),
      );

      result.current.onEditorScroll();
      // rAF is pending — unmount before flushing.
      unmount();

      expect(caf).toHaveBeenCalled();
      expect(pending.size).toBe(0);
    });
  });

  describe('division-by-zero guard', () => {
    it('skips sync when source is not scrollable', () => {
      const { flush } = setupRafMock();

      const editorEl = makeEl(0, 100, 100); // scrollable = 0
      const previewEl = makeEl(0, 400, 100);

      const { result } = renderHook(() =>
        useScrollSync(makeRef(editorEl), makeRef(previewEl)),
      );

      result.current.onEditorScroll();
      flush();
      flush();

      expect(previewEl.scrollTop).toBe(0);
    });
  });
});
