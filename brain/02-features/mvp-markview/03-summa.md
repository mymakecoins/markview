# Summa: mvp-markview

## In one sentence
A client-side SPA that renders GitHub Flavored Markdown in real time, persists content in
`localStorage`, and sanitizes all HTML output through a single DOMPurify pipeline.

---

## Hard requirements (the Judge enforces these)

### Security (non-negotiable)
- Every Markdown → DOM path MUST pass through `lib/markdown.sanitize()` (DOMPurify).
- `<PreviewPane>` is the **only** `dangerouslySetInnerHTML` site in `src/`. Any additional
  `dangerouslySetInnerHTML` anywhere is an automatic FAIL.
- `<PreviewPane>` MUST NOT import `marked` or `DOMPurify` directly.
- `useMarkdown` MUST NOT call `marked` or `DOMPurify` directly — only via `lib/markdown`.

### Architecture (locked by ADR 0001)
- No backend, no server calls, no API requests for rendering logic.
- No `any` types anywhere in `src/`. `tsc --noEmit` must exit 0.
- All components use named function declaration + default export.

### Functional
- `marked` configured with `{ gfm: true, breaks: false }` — exactly once at module scope.
- `useMarkdown` debounces the render pipeline at ≤ 100ms from last keystroke.
- `useScrollSync` guard flag `isSyncing` must prevent the echo/infinite-loop: a programmatic
  write to the target pane MUST NOT fire the source pane's handler.
- `useLocalStorage` must survive `QuotaExceededError` and `localStorage` unavailability
  without throwing — degrade to in-memory only.
- Theme persists to `markview:theme`; falls back to `prefers-color-scheme`.

---

## Files that should change
*(Judge flags edits outside this list)*

```
package.json
vite.config.ts
tsconfig.json
tailwind.config.ts
postcss.config.js
index.html
src/main.tsx
src/styles/index.css
src/styles/markdown.css
src/App.tsx
src/App.test.tsx
src/lib/markdown.ts
src/lib/markdown.test.ts
src/hooks/useLocalStorage.ts
src/hooks/useLocalStorage.test.ts
src/hooks/useMarkdown.ts
src/hooks/useMarkdown.test.ts
src/hooks/useTheme.ts
src/hooks/useTheme.test.ts
src/hooks/useScrollSync.ts
src/hooks/useScrollSync.test.ts
src/components/ThemeToggle.tsx
src/components/Toolbar.tsx
src/components/EditorPane.tsx
src/components/PreviewPane.tsx
src/components/PreviewPane.test.tsx
vitest.config.ts
.eslintrc.cjs
.prettierrc
```

---

## Files that must NOT change
*(Judge rejects PRs touching these)*

```
brain/02-features/mvp-markview/00-prd.md
brain/02-features/mvp-markview/01-design.md
brain/02-features/mvp-markview/02-tasks.md
brain/03-memory/**
.claude/CLAUDE.md
.claude/hooks/**
.claude/rules/**
```

> **Exception — status markers:** diffs in `02-tasks.md` where **every changed line** matches
> the pattern `**Status:** [ ]` / `[~]` / `[x]` / `[!]` are exempt from the denylist check.
> Any other edit to `02-tasks.md` (spec content, steps, acceptance criteria) remains an automatic FAIL.

---

## Done means

All of the following must hold simultaneously for PASS:

1. **`npx vitest run` exits 0** — full test suite green, no skipped tests.
2. **`tsc --noEmit` exits 0** — zero TypeScript errors, zero `any` types.
3. **XSS neutralized end-to-end:** typing `<script>alert(1)</script>` into the editor produces
   a preview DOM with no `<script>` element.
4. **Single injection site:** `grep -r dangerouslySetInnerHTML src/` returns exactly **one** match
   (`PreviewPane.tsx`).
5. **GFM renders correctly:** a table, a fenced code block, and a `- [x]` task list each produce
   the expected HTML structure (`<table>`, `<pre><code>`, `<input type="checkbox" disabled>`).
6. **Persistence:** content typed in the editor survives a full unmount + remount cycle
   (simulated page refresh) by restoring from `markview:content`.
7. **Theme toggle:** clicking `<ThemeToggle>` flips `document.documentElement`'s `data-theme`
   attribute and writes `markview:theme` to `localStorage`.
8. **Scroll sync safety:** the scroll-sync test completes without timeout and without triggering
   a re-entrant write back to the source pane.
9. **`npm run dev`** starts Vite and serves the app without console errors.
