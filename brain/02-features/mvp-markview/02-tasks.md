# Tasks: mvp-markview

> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

Derived from `01-design.md` (source of truth) and `00-prd.md`. Tasks are ordered bottom-up
through the dependency graph: bootstrap → `lib/markdown.ts` → hooks → components → `<App>`
integration → styling → smoke test. Each task is atomic (one logical change) and lists
verifiable acceptance criteria.

Conventions:
- All components: named function declaration + default export (framework requirement).
- No `any` anywhere. `tsc --noEmit` must pass after every task.
- The **only** Markdown→DOM path is `useMarkdown` → `lib/markdown.sanitize()`; the **only**
  `dangerouslySetInnerHTML` site is `<PreviewPane>`.

---

## Task 1: Bootstrap Vite + React + TS + Tailwind + dependencies

**Status:** [x]

**Files affected:**
- `package.json` (new)
- `vite.config.ts` (new)
- `tsconfig.json` (new)
- `tailwind.config.ts` (new)
- `postcss.config.js` (new)
- `index.html` (new)
- `src/main.tsx` (new)
- `src/styles/index.css` (new — Tailwind directives only)
- `vitest.config.ts` (new) or `test` block inside `vite.config.ts`
- `.eslintrc.cjs` (new), `.prettierrc` (new)

**Description:**
Stand up the empty SPA shell so every later task has a compiling, runnable project. No app
logic yet — just the toolchain and a mounting `<App>` placeholder. Comes first because nothing
else compiles without it.

**Steps:**
1. Init Vite project with the React + TypeScript template.
2. Add runtime deps: `marked`, `dompurify`, `react`, `react-dom`.
3. Add dev deps: `@types/dompurify`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `tailwindcss`, `postcss`, `autoprefixer`, ESLint + Prettier.
4. Configure Tailwind `darkMode: ['selector', '[data-theme="dark"]']` (per design integration point).
5. Add Tailwind directives to `src/styles/index.css`; import it in `src/main.tsx`.
6. Configure Vitest with `environment: 'jsdom'` and `globals: true`.
7. `src/main.tsx` mounts a trivial `<App>` placeholder rendering a static string (real App built in Task 8).

**Acceptance criteria:**
- [ ] `npm install` completes with `marked`, `dompurify`, `@types/dompurify`, `vitest` present in `package.json`.
- [ ] `npm run dev` starts Vite and serves the placeholder without console errors.
- [ ] `tsc --noEmit` exits 0.
- [ ] `npx vitest run` exits 0 (no tests yet, or a single trivial passing test).
- [ ] Tailwind config sets `darkMode: ['selector', '[data-theme="dark"]']`.

**Out of scope:**
- Any hook, real component, or markdown logic.
- `.markdown-body` styling or theme tokens (Task 9).

---

## Task 2: Implement `lib/markdown.ts` — single sanitize wrapper + `marked` config

**Status:** [x]

**Files affected:**
- `src/lib/markdown.ts` (new)
- `src/lib/markdown.test.ts` (new)

**Description:**
The security keystone. Configures `marked` once at module scope (`{ gfm: true, breaks: false }`)
and exports the single `sanitize()` wrapper around `DOMPurify.sanitize` plus a `render()` helper
that runs `parse → sanitize`. Must exist before any hook or component that touches markdown.

**Steps:**
1. Configure `marked` at module scope: `gfm: true`, `breaks: false`.
2. Define the `SanitizeConfig` per design: `USE_PROFILES: { html: true }`, `ADD_ATTR: ['target']`, `FORBID_TAGS: ['style']`, `FORBID_ATTR: ['onerror', 'onload', 'onclick']`.
3. Export `sanitize(rawHtml: string): string` calling `DOMPurify.sanitize(rawHtml, CONFIG)`.
4. Export `render(markdown: string): string` = `sanitize(marked.parse(markdown) as string)`.
5. Write golden-output Vitest tests for XSS and GFM survival.

**Acceptance criteria:**
- [ ] Vitest: `sanitize('<script>alert(1)</script>')` returns `''`.
- [ ] Vitest: `sanitize('<img src=x onerror=alert(1)>')` returns markup with no `onerror` attribute.
- [ ] Vitest: `sanitize('<input type="checkbox" disabled>')` retains the `<input type="checkbox">` element (GFM task-list checkbox survives).
- [ ] Vitest: `render('| a | b |\n|---|---|\n| 1 | 2 |')` produces a `<table>` with `<th>`/`<td>`.
- [ ] Vitest: ``render('```\ncode\n```')`` produces a `<pre><code>` block.
- [ ] Vitest: `render('- [x] done')` produces a checked checkbox input.
- [ ] `marked` is configured exactly once at module scope (not per call).
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- Debounce logic (lives in `useMarkdown`, Task 4).
- React imports — this is a pure lib module.

---

## Task 3: Implement `useLocalStorage` hook

**Status:** [x]

**Files affected:**
- `src/hooks/useLocalStorage.ts` (new)
- `src/hooks/useLocalStorage.test.ts` (new)

**Description:**
Pure persistence utility with no other project dependencies. Lazy-reads the key on mount,
debounces writes ~300ms, and survives `QuotaExceededError` and disabled storage (private mode).
Ordered before `useMarkdown`/`useTheme` by independence; it has zero internal deps.

**Steps:**
1. Signature: `useLocalStorage(key: string, initialValue: string): [string, (next: string) => void]`.
2. Lazy initializer reads `localStorage.getItem(key)` once inside try/catch; falls back to `initialValue`.
3. `setValue` updates in-memory state immediately; schedules a ~300ms debounced `localStorage.setItem`.
4. Wrap every read and write in try/catch. On `QuotaExceededError` or thrown access, keep the in-memory value and do not crash.
5. Clear pending debounce timer on unmount.

**Acceptance criteria:**
- [ ] Vitest: value written via `setValue` is readable from `localStorage` after the debounce window elapses (fake timers).
- [ ] Vitest: mounting with a pre-seeded `localStorage` key returns that stored value, not `initialValue`.
- [ ] Vitest: when `setItem` throws `QuotaExceededError`, the hook does not throw and the in-memory value remains correct.
- [ ] Vitest: when `localStorage.getItem` throws (simulated private mode), the hook returns `initialValue` and does not crash.
- [ ] Pending timer is cleared on unmount (no write-after-unmount warning).
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- JSON envelope/serialization (values are plain strings per design).
- Theme-specific logic (Task 5 uses immediate, not debounced, writes).

---

## Task 4: Implement `useMarkdown` hook

**Status:** [ ]

**Files affected:**
- `src/hooks/useMarkdown.ts` (new)
- `src/hooks/useMarkdown.test.ts` (new)

**Description:**
Debounces the `parse → sanitize` pipeline (default 60ms) and returns the sanitized HTML.
Depends on `lib/markdown.ts` (Task 2). This is the single, unbypassable Markdown→DOM path.

**Steps:**
1. Signature: `useMarkdown(markdown: string, options?: { debounceMs?: number }): RenderResult` where `RenderResult = { html: string; isStale: boolean }`.
2. Default `debounceMs` to 60.
3. On `markdown` change, set `isStale: true`, schedule debounced `render(markdown)` from `lib/markdown.ts`.
4. When the timer fires, store the sanitized `html` and set `isStale: false`. Keep the previous `html` while pending.
5. Clear pending timer on unmount and on rapid successive changes.

**Acceptance criteria:**
- [ ] Vitest: after the debounce window, `html` equals `render(markdown)` output from `lib/markdown.ts`.
- [ ] Vitest: feeding `'<script>alert(1)</script>'` yields `html` with no `<script>` tag — **no code path returns unsanitized HTML** (every output passes through `lib/markdown.sanitize`).
- [ ] Vitest: rapid successive updates within the debounce window produce a single render call (spy on `render`), proving coalescing.
- [ ] Vitest: `isStale` is `true` while a debounce timer is pending and `false` after it resolves.
- [ ] Hook imports `render`/`sanitize` from `src/lib/markdown.ts`; does **not** call `marked` or `DOMPurify` directly.
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- Web Worker offloading (deferred per design Risks).
- localStorage persistence of HTML (HTML is derived, never stored).

---

## Task 5: Implement `useTheme` hook

**Status:** [ ]

**Files affected:**
- `src/hooks/useTheme.ts` (new)
- `src/hooks/useTheme.test.ts` (new)

**Description:**
Manages `'light' | 'dark'` theme. On mount reads `markview:theme`, falls back to
`prefers-color-scheme`. Writes `data-theme` on `<html>` and persists the choice immediately.
Depends on localStorage availability (not on the `useLocalStorage` hook — writes are immediate, not debounced).

**Steps:**
1. Signature: `useTheme(): { theme: Theme; toggleTheme: () => void }`.
2. On mount: read `markview:theme`; if absent, use `window.matchMedia('(prefers-color-scheme: dark)')`.
3. Effect: set `document.documentElement.setAttribute('data-theme', theme)`.
4. `toggleTheme` flips light↔dark and persists immediately to `markview:theme` (try/catch).
5. Guard `matchMedia`/`localStorage` access for environments where they are missing.

**Acceptance criteria:**
- [ ] Vitest: with `markview:theme = 'dark'` pre-seeded, the hook returns `theme === 'dark'` on mount.
- [ ] Vitest: with no stored key and `matchMedia` mocked to dark, initial `theme === 'dark'`.
- [ ] Vitest: `toggleTheme()` flips the value and `document.documentElement` gets `data-theme` matching the new theme.
- [ ] Vitest: after `toggleTheme()`, `localStorage.getItem('markview:theme')` equals the new theme.
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- The inline pre-paint anti-FOUC script in `index.html` (handled in Task 9).
- The `<ThemeToggle>` UI (Task 7).

---

## Task 6: Implement `useScrollSync` hook

**Status:** [ ]

**Files affected:**
- `src/hooks/useScrollSync.ts` (new)
- `src/hooks/useScrollSync.test.ts` (new)

**Description:**
Imperative, DOM-ref-based bidirectional scroll sync at 60fps via `requestAnimationFrame`,
with proportional mapping and an `isSyncing` guard to kill the echo loop. No React state, no
re-renders. Ordered before components because they consume its returned handlers.

**Steps:**
1. Signature: `useScrollSync(editorRef, previewRef): { onEditorScroll, onPreviewScroll }`.
2. Internal `SyncState`: `{ isSyncing: boolean; rafId: number | null }` held in a ref.
3. On scroll of source: if `isSyncing` is true, return (ignore echo). Otherwise set `isSyncing = true`, cancel any in-flight rAF, schedule a rAF.
4. Inside rAF: compute `targetScrollTop = (srcScrollTop / srcScrollable) * targetScrollable`, write it to the other ref, then clear `isSyncing` on the following tick.
5. Cancel in-flight rAF on unmount.

**Acceptance criteria:**
- [ ] Vitest: scrolling editor to 50% sets preview `scrollTop` to ~50% of its scrollable range (proportional mapping).
- [ ] Vitest: a programmatic write to the target's `scrollTop` does **not** trigger a re-entrant sync back to the source — **no infinite scroll loop (`isSyncing` guard verified)** by asserting the source handler is not re-invoked / write count stays bounded.
- [ ] Vitest: the hook causes **zero React re-renders** (assert render count unchanged across scroll events).
- [ ] In-flight `requestAnimationFrame` is cancelled on unmount (no callback after teardown).
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- Line-anchor / source-map scroll mapping (post-MVP per design).
- Wiring refs into `<App>` (Task 8).

---

## Task 7: Implement presentational components — `<ThemeToggle>`, `<Toolbar>`, `<EditorPane>`, `<PreviewPane>`

**Status:** [ ]

**Files affected:**
- `src/components/ThemeToggle.tsx` (new)
- `src/components/Toolbar.tsx` (new)
- `src/components/EditorPane.tsx` (new)
- `src/components/PreviewPane.tsx` (new)
- `src/components/PreviewPane.test.tsx` (new)

**Description:**
The four stateless components, batched because each is trivially small and purely
presentational. They consume props/handlers produced by earlier hooks. `<PreviewPane>` is the
sole `dangerouslySetInnerHTML` site and must never receive raw markdown.

**Steps:**
1. `<ThemeToggle>` props `{ theme, onToggle }`: accessible button with `aria-pressed` and `aria-label`.
2. `<Toolbar>` props `{ theme, onToggleTheme }`: app title + `<ThemeToggle>`.
3. `<EditorPane>` props `{ value, onChange, editorRef, onScroll }`: controlled full-height mono `<textarea>` wired to `editorRef` and `onScroll`.
4. `<PreviewPane>` props `{ html, previewRef, onScroll }`: a `<div className="markdown-body">` with `ref={previewRef}`, `onScroll`, and `dangerouslySetInnerHTML={{ __html: html }}`.
5. All four use named function declaration + default export; no `any`.

**Acceptance criteria:**
- [ ] Vitest: `<PreviewPane html="<p>hi</p>" />` renders the markup inside a `.markdown-body` container.
- [ ] Audit: `<PreviewPane>` is the **only** `dangerouslySetInnerHTML` site in the codebase (`grep -r dangerouslySetInnerHTML src/` returns exactly one match).
- [ ] `<PreviewPane>` accepts only an already-sanitized `html: string` prop — it does not import `marked`, `DOMPurify`, or call any parse/sanitize function.
- [ ] `<ThemeToggle>` button exposes `aria-pressed` reflecting theme and a descriptive `aria-label`.
- [ ] `<EditorPane>` `<textarea>` is controlled (`value` + `onChange`) and forwards `editorRef` and `onScroll`.
- [ ] `tsc --noEmit` exits 0; no `any`; all components use default export.

**Out of scope:**
- State ownership and hook wiring (Task 8).
- `.markdown-body` visual styling rules (Task 9).

---

## Task 8: Wire everything in `<App>` integration

**Status:** [ ]

**Files affected:**
- `src/App.tsx` (modify — replaces Task 1 placeholder)

**Description:**
The single source of truth. Owns `markdown` (via `useLocalStorage`) and `theme` (via
`useTheme`), derives sanitized HTML via `useMarkdown`, wires scroll sync, and renders the
toolbar plus both panes. Last in the logic chain because it depends on every hook and component above.

**Steps:**
1. `const [markdown, setMarkdown] = useLocalStorage('markview:content', '')`.
2. `const { theme, toggleTheme } = useTheme()`.
3. `const { html } = useMarkdown(markdown)`.
4. Create `editorRef` / `previewRef`; `const { onEditorScroll, onPreviewScroll } = useScrollSync(editorRef, previewRef)`.
5. Render `<Toolbar>` + `<EditorPane>` + `<PreviewPane>`, threading `markdown`, `setMarkdown`, `html`, refs, and scroll handlers.

**Acceptance criteria:**
- [ ] Vitest: typing into the editor `<textarea>` updates the `<PreviewPane>` rendered HTML (after debounce, fake timers).
- [ ] Vitest: `markdown` is read from `useLocalStorage('markview:content', '')` and `theme` from `useTheme` — no other state store.
- [ ] `<PreviewPane>` receives only `useMarkdown`'s `html` output (sanitized) — not `markdown`.
- [ ] App renders without console errors on mount with empty storage.
- [ ] `tsc --noEmit` exits 0; no `any`.

**Out of scope:**
- Router / global store (lifted state only, per design).
- Final visual polish (Task 9).

---

## Task 9: GFM styling, theme tokens, and anti-FOUC pre-paint script

**Status:** [ ]

**Files affected:**
- `src/styles/markdown.css` (new — `.markdown-body` + theme custom properties)
- `index.html` (modify — inline pre-paint `data-theme` script)
- `src/main.tsx` (modify — import `markdown.css`)

**Description:**
Provides `.markdown-body` GFM styling (tables, fenced code, task-list checkboxes) and theme
CSS custom properties keyed off `[data-theme]`, plus the inline pre-paint script that sets
`data-theme` on `<html>` before React hydrates to prevent FOUC. Comes after `<App>` so styling
targets real rendered structure.

**Steps:**
1. Define CSS custom properties for light/dark under `[data-theme="light"]` / `[data-theme="dark"]`.
2. Style `.markdown-body` GFM elements: tables (borders), `pre/code` blocks, task-list `input[type=checkbox]`, `del`, blockquotes, headings.
3. Add an inline `<script>` in `index.html` `<head>` that reads `markview:theme` (or `prefers-color-scheme`) and sets `document.documentElement.dataset.theme` before paint.
4. Import `markdown.css` in `src/main.tsx`.

**Acceptance criteria:**
- [ ] `.markdown-body table`, `pre code`, and `input[type=checkbox]` have explicit visible styling rules.
- [ ] Toggling theme (via `useTheme`) visibly switches token values through `[data-theme]` selectors.
- [ ] Inline pre-paint script sets `data-theme` on `<html>` before React mounts (no flash of wrong theme).
- [ ] Theme tokens reach injected sanitized HTML (`.markdown-body` styling applies to preview content, not just Tailwind-classed elements).
- [ ] `tsc --noEmit` exits 0; no console errors on load.

**Out of scope:**
- Logic changes to any hook or component.
- Adding new `dangerouslySetInnerHTML` sites.

---

## Task 10: End-to-end smoke test (`App.test.tsx`)

**Status:** [ ]

**Files affected:**
- `src/App.test.tsx` (new)

**Description:**
Integration test proving the three critical user-visible guarantees end to end: XSS is
neutralized, content persists across remount, and theme toggles. Last because it exercises the
fully wired app.

**Steps:**
1. Render `<App>` with Testing Library.
2. Type markdown containing `<script>alert(1)</script>` into the editor; advance fake timers; assert no `<script>` in the rendered preview DOM.
3. Type content, advance the persistence debounce, unmount, remount; assert content is restored from `markview:content`.
4. Click the theme toggle; assert `document.documentElement` `data-theme` flips and `markview:theme` is written.

**Acceptance criteria:**
- [ ] Vitest: after typing `<script>alert(1)</script>`, the preview DOM contains **no** `<script>` element (XSS path proven end to end).
- [ ] Vitest: content typed, then app remounted, restores from `localStorage` (`markview:content`).
- [ ] Vitest: clicking `<ThemeToggle>` flips `<html data-theme>` and persists `markview:theme`.
- [ ] Vitest: scrolling does not throw and does not enter an infinite loop (test completes without timeout).
- [ ] `npx vitest run` exits 0 for the full suite; `tsc --noEmit` exits 0.

**Out of scope:**
- Performance/latency benchmarking (RNF03/RNF05 measured separately, not in unit suite).
- Visual regression / pixel snapshots.
