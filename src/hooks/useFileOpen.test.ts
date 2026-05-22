import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFileOpen } from './useFileOpen';

const ERR_BAD_TYPE = 'Unsupported file type. Please choose a .md or .txt file.';
const ERR_TOO_LARGE = 'This file exceeds the 10MB limit and cannot be opened.';
const ERR_READ_FAILED =
  'Could not read the selected file. It may have been moved, deleted, or you may not have permission to read it.';
const CONFIRM_OVERWRITE_MSG =
  'Opening a file will replace the current editor content. Continue?';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function makeFile(name: string, content: string, overrideSize?: number): File {
  const file = new File([content], name);
  if (overrideSize !== undefined) {
    Object.defineProperty(file, 'size', { value: overrideSize, configurable: true });
  }
  // Polyfill File.text() — some jsdom builds don't implement Blob.text()
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
    writable: true,
  });
  return file;
}

function mockFsaHandle(file: File): FileSystemFileHandle {
  return { getFile: vi.fn().mockResolvedValue(file) } as unknown as FileSystemFileHandle;
}

describe('useFileOpen', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockReturnValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls onLoad with file text on successful read (FSA API)', async () => {
    const file = makeFile('readme.md', '# Hello');
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([mockFsaHandle(file)]));

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(onLoad).toHaveBeenCalledWith('# Hello');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls onLoad via <input> fallback when showOpenFilePicker is absent', async () => {
    // jsdom does not implement showOpenFilePicker; ensure it's absent
    delete (window as unknown as Record<string, unknown>).showOpenFilePicker;

    const mockFile = makeFile('notes.md', '# Notes');

    // Override HTMLInputElement.click to simulate user selecting a file
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      if (this.type === 'file') {
        Object.defineProperty(this, 'files', {
          value: { 0: mockFile, length: 1 },
          configurable: true,
        });
        this.dispatchEvent(new Event('change'));
      }
    });

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(onLoad).toHaveBeenCalledWith('# Notes');
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts without calling onLoad when dirty confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => true }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(window.confirm).toHaveBeenCalledWith(CONFIRM_OVERWRITE_MSG);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('silently returns without alert when picker is cancelled (AbortError)', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn().mockRejectedValue(new DOMException('User aborted', 'AbortError')),
    );

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(window.alert).not.toHaveBeenCalled();
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('alerts ERR_BAD_TYPE and does not call onLoad for unsupported extension', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn().mockResolvedValue([mockFsaHandle(makeFile('document.docx', 'binary'))]),
    );

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(window.alert).toHaveBeenCalledWith(ERR_BAD_TYPE);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('alerts ERR_TOO_LARGE and does not call onLoad when file exceeds 10MB', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn().mockResolvedValue([mockFsaHandle(makeFile('huge.md', 'x', MAX_SIZE_BYTES + 1))]),
    );

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(window.alert).toHaveBeenCalledWith(ERR_TOO_LARGE);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('alerts ERR_READ_FAILED and does not call onLoad when file.text() rejects', async () => {
    const brokenFile = makeFile('broken.md', '');
    // Override the polyfilled text() to simulate a read failure
    Object.defineProperty(brokenFile, 'text', {
      value: () => Promise.reject(new Error('read error')),
      configurable: true,
    });
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([mockFsaHandle(brokenFile)]));

    const onLoad = vi.fn();
    const { result } = renderHook(() => useFileOpen({ onLoad, isDirty: () => false }));

    await act(async () => {
      await result.current.openFile();
    });

    expect(window.alert).toHaveBeenCalledWith(ERR_READ_FAILED);
    expect(onLoad).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
