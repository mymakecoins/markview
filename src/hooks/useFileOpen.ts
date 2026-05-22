import { useCallback, useRef, useState } from 'react';

const ACCEPTED_EXTENSIONS = ['.md', '.txt'];
const ACCEPTED_MIME = ['text/markdown', 'text/plain'];
const WARN_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const CONFIRM_OVERWRITE_MSG =
  'Opening a file will replace the current editor content. Continue?';
const WARN_LARGE_MSG =
  'This file is larger than 2MB and may slow down the editor. Open anyway?';
const ERR_BAD_TYPE = 'Unsupported file type. Please choose a .md or .txt file.';
const ERR_TOO_LARGE = 'This file exceeds the 10MB limit and cannot be opened.';
const ERR_READ_FAILED =
  'Could not read the selected file. It may have been moved, deleted, or you may not have permission to read it.';

type ShowOpenFilePickerOptions = {
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption: boolean;
  multiple: boolean;
};

type WindowWithPicker = Window &
  typeof globalThis & {
    showOpenFilePicker: (
      options: ShowOpenFilePickerOptions,
    ) => Promise<FileSystemFileHandle[]>;
  };

export type UseFileOpenOptions = {
  onLoad: (content: string) => void;
  isDirty: () => boolean;
};

export type UseFileOpenResult = {
  openFile: () => Promise<void>;
  isLoading: boolean;
};

export function useFileOpen(options: UseFileOpenOptions): UseFileOpenResult {
  const [isLoading, setIsLoading] = useState(false);

  // Keep options current every render so openFile (memoised with []) never
  // closes over stale isDirty / onLoad — same pattern as keyRef in useLocalStorage.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const openFile = useCallback(async (): Promise<void> => {
    // Step 1: dirty-state guard
    if (
      optionsRef.current.isDirty() &&
      !window.confirm(CONFIRM_OVERWRITE_MSG)
    ) {
      return;
    }

    // Step 2: acquire a File object
    let file: File;
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as WindowWithPicker).showOpenFilePicker({
          types: [
            {
              description: 'Markdown',
              accept: {
                'text/markdown': ['.md'],
                'text/plain': ['.txt'],
              },
            },
          ],
          excludeAcceptAllOption: true,
          multiple: false,
        });
        file = await handle.getFile();
      } else {
        // Fallback: detached <input type="file">.
        // On cancel the change event never fires — the promise intentionally
        // hangs. isLoading is only set after file acquisition so no stuck state.
        file = await new Promise<File>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = `${ACCEPTED_EXTENSIONS.join(',')},${ACCEPTED_MIME.join(',')}`;
          input.addEventListener(
            'change',
            () => {
              const picked = input.files?.[0];
              if (picked !== undefined) {
                resolve(picked);
              }
              document.body.removeChild(input);
            },
            { once: true },
          );
          document.body.appendChild(input);
          input.click();
        });
      }
    } catch (err) {
      // Picker dismissed — silent no-op. Any other error propagates to outer catch.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      throw err;
    }

    // Step 3: extension validation (enforced regardless of picker accept hints)
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      window.alert(ERR_BAD_TYPE);
      return;
    }

    // Step 4: size validation
    if (file.size > MAX_SIZE_BYTES) {
      window.alert(ERR_TOO_LARGE);
      return;
    }
    if (file.size > WARN_SIZE_BYTES) {
      if (!window.confirm(WARN_LARGE_MSG)) {
        return;
      }
    }

    // Step 5: async read — isLoading scoped exclusively to this await
    let text: string;
    setIsLoading(true);
    try {
      text = await file.text();
    } catch {
      window.alert(ERR_READ_FAILED);
      return;
    } finally {
      setIsLoading(false);
    }

    // Step 6: deliver content to caller
    optionsRef.current.onLoad(text);
  }, []);

  return { openFile, isLoading };
}
