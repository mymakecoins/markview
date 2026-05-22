import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

// jsdom does not implement requestAnimationFrame; stub it so useScrollSync
// resolves both rAF calls synchronously (compute + clear-guard).
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});
vi.stubGlobal('cancelAnimationFrame', () => undefined);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('App smoke tests', () => {
  it('renders without crashing and shows the app title', () => {
    render(<App />);
    expect(screen.getByText('MarkView')).toBeInTheDocument();
  });

  it('XSS: typing <script> into the editor produces no <script> in the preview', async () => {
    render(<App />);

    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();

    await act(async () => {
      fireEvent.change(textarea!, {
        target: { value: '<script>alert(1)</script>' },
      });
      // Advance past useMarkdown debounce (60ms) + useLocalStorage debounce (300ms)
      vi.advanceTimersByTime(300);
    });

    const preview = document.querySelector('.markdown-body');
    expect(preview).not.toBeNull();
    expect(preview!.querySelector('script')).toBeNull();
  });

  it('persistence: content typed before unmount is restored after remount from markview:content', async () => {
    const { unmount } = render(<App />);

    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();

    await act(async () => {
      fireEvent.change(textarea!, { target: { value: '# Hello persistence' } });
      // Must advance past the 300ms localStorage debounce so the write fires
      vi.advanceTimersByTime(300);
    });

    expect(localStorage.getItem('markview:content')).toBe('# Hello persistence');

    unmount();
    document.documentElement.removeAttribute('data-theme');

    // Remount — useLocalStorage lazy-reads from storage on mount
    render(<App />);

    const restoredTextarea = document.querySelector('textarea');
    expect(restoredTextarea).not.toBeNull();
    expect(restoredTextarea!.value).toBe('# Hello persistence');
  });

  it('theme toggle: clicking ThemeToggle flips data-theme on <html> and persists to markview:theme', async () => {
    render(<App />);

    // Determine what theme mounted as (matchMedia absent in jsdom → 'light')
    const initialTheme =
      document.documentElement.getAttribute('data-theme') ?? 'light';
    const expectedNext = initialTheme === 'light' ? 'dark' : 'light';

    const toggleLabel =
      initialTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    const toggleButton = screen.getByRole('button', { name: toggleLabel });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe(
      expectedNext,
    );
    expect(localStorage.getItem('markview:theme')).toBe(expectedNext);
  });

  it('scroll sync: calling scroll handlers does not throw and does not loop', () => {
    render(<App />);

    const textarea = document.querySelector('textarea');
    const previewDiv = document.querySelector('.markdown-body');
    expect(textarea).not.toBeNull();
    expect(previewDiv).not.toBeNull();

    expect(() => {
      fireEvent.scroll(textarea!);
      fireEvent.scroll(previewDiv!);
      fireEvent.scroll(textarea!);
    }).not.toThrow();
  });
});
