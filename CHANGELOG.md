# Changelog

All notable changes to Spec Kit Playground are tracked here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); pre-1.0 versioning uses minor = phase number per the project's per-phase ship workflow.

## [Unreleased]

(empty)

## [0.3.0] - 2026-05-08 — Phase 3: Persistence

### Added
- IndexedDB persistence in `src/core/storage.ts` over `idb-keyval` under the versioned key `spk:workspace:v1`. The workspace is serialized to a plain `SerializedWorkspace` shape with an explicit `schemaVersion: 1` field so future schema bumps are unambiguous.
- `deserializeWorkspace(raw)` defends against missing or malformed fields: returns `null` only when the workspace `id` is unrecoverable, otherwise fills sensible defaults (`name='My Project'`, empty features list, `activeDocId={kind:'constitution'}`). Drops malformed feature entries instead of failing the whole load. Falls back to constitution when `activeDocId` references a deleted feature or has an invalid `doc` kind.
- Auto-save effect: a `@preact/signals` `effect` watches `workspaceSignal` and writes to IndexedDB through a 500 ms debounced flush. Skips the very first effect run so hydrate doesn't trigger a redundant save.
- `hydrateAndStartAutoSave()` in `src/core/state.ts` is awaited from `main.tsx` before the first render. If saved state exists it replaces the default empty workspace and primes the save status to `saved`.
- Save-status pill (`SaveStatus.tsx`) in the header — shows "Saving…" while a write is in flight, "Saved Xs/Xm/Xh ago" when the last write succeeded, and is hidden when idle (no save has happened). Live region (`aria-live="polite"`) for screen readers.
- Settings menu (`SettingsMenu.tsx`) — three-dot toggle in the header that opens a popover. First menu item: "Reset workspace…" with a `window.confirm` and `commitResetWorkspace()` that clears IndexedDB and seeds a fresh constitution. Outside-click and Escape both close the popover.
- First-run banner (`FirstRunBanner.tsx`) shown above the editor when the workspace is `isPristineWorkspace` (no features, constitution still equals the template). Dismissible. Includes an "Add a feature" button wired to the new-feature modal.

### Why it matters
Closes the persistence loop. The user can now type, refresh the page, and pick up exactly where they left off — no manual saves, no lost work. This is the feature that unlocks the rest of the project: every later phase assumes work survives a reload.

### Architecture
- Storage IO is split from serialization: `serialize/deserialize` are pure functions (heavily unit-tested) and only `loadWorkspace`/`saveWorkspace`/`clearWorkspace` touch idb-keyval. Tests cover the pure layer; e2e covers the IO layer in a real browser.
- The auto-save effect lives in `src/core/state.ts` next to the signals it watches. Idempotent — `startAutoSave` guards against double-registration.
- `commitResetWorkspace` is async (it awaits `clearWorkspace` before mutating the in-memory signal) so a reset followed immediately by a reload always sees an empty store.

### UX details
- Save pill min-width prevents header layout jitter as it cycles through statuses.
- "Saving…" is amber (warning token), "Saved" is green (success token), idle is hidden — so the pill is information, not noise.
- The first-run banner is dismissible without persisting the dismissal — opening a fresh tab brings it back. Acceptable for v1; Phase 5 polish can refine if needed.
- Settings popover uses `role="menu"` + `role="menuitem"` and dismisses on Escape or outside click.

### Tests
- Unit (Vitest, **70 passed**, +11 from last phase): full storage suite covering round-trip with and without features, JSON-stringified round-trip, malformed input handling, missing fields with defaults, dropped invalid features, activeDocId fallbacks, NaN/string timestamp coercion.
- e2e (Playwright, **9 passed**, +2 from last phase): edits persist across page reload (asserts via `[data-status="saved"]` then reloads); reset clears the workspace and the cleared state survives a reload (proving idb was actually cleared, not just memory).

### Bundle
- App JS: **204.0 KB brotli** (limit: 350 KB) — +1.6 KB for storage + status + settings + first-run code; idb-keyval is ~1 KB on its own.
- App CSS: 2.33 KB brotli (limit: 20 KB).

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓ (added `Node` to globals for the SettingsMenu's outside-click handler)
- `prettier --check .` ✓
- `vitest run` (70 passed) ✓
- `vite build` ✓
- `size-limit` (204.0 KB / 350 KB) ✓
- `playwright test` (9 passed) ✓

## [0.2.0] - 2026-05-07 — Phase 2: Domain + sidebar nav

### Added
- Full domain model in `src/core/types.ts`: `Workspace`, `Feature`, `Document`, and a discriminated `ActiveDocId` (`{kind: 'constitution'} | {kind: 'feature', featureId, doc}`). `activeDocsAreEqual` for cheap equality.
- Pure reducers in `src/core/state.ts`: `createEmptyWorkspace`, `addFeature`, `renameFeature`, `deleteFeature`, `setActiveDoc`, `updateActiveDocContent`. Each returns a new workspace; tests assert immutability and reference-stability when nothing changed.
- Signals layer alongside the reducers: `workspaceSignal`, `activeDocContent` and `activeDocLabel` computeds, plus `commit*` thunks. Tests import the reducers directly and never touch the signals.
- `src/core/templates.ts` re-exports the four upstream templates as strings via Vite's `?raw`. Build-time embedding, no runtime fetch.
- `src/utils/slug.ts` (`slugify`, `formatFeatureNumber`, `featureDirName`) with 14 unit tests covering diacritics, non-ASCII fallthrough, length truncation without trailing hyphens, punctuation collapsing.
- `src/components/Sidebar.tsx` + `DocumentTree.tsx`: Memory section (constitution.md) and Specs section listing each feature with its three docs nested under a dashed connector. Active leaf is highlighted with the accent-soft palette.
- Hover/focus-revealed rename and delete actions on each feature. Rename uses an inline input (Enter to commit, Escape to cancel). Delete uses `window.confirm`.
- `src/components/NewFeatureModal.tsx`: backdrop-dismissable modal with an autofocused title field, live slug preview (`Will be saved as 001-user-auth`), Cancel + Create buttons. Mounted only when open so component state always starts fresh.
- Active-doc label in the header (`spec.md — User Auth`) so the user always knows which document the editor is showing.

### Why it matters
First multi-document workflow. The user can now build out a real Spec Kit project — constitution plus N features each with spec/plan/tasks — and switch between any of them. Templates seed each new feature so the content matches what `specify init` would produce.

### Architecture
- Editor is forced to remount on doc switch via `key={activeDocKey(activeDocId)}` in `app.tsx`. Simpler than dispatching CodeMirror transactions to swap docs, and fast (CM mounts in single-digit ms). Future phase can revisit if it ever feels janky.
- Reducers are pure and deterministic except for `Date.now()` and `crypto.randomUUID()`. Tests don't mock either — assertions only check structural invariants, not exact ids/timestamps.
- Feature numbering is monotonic: `nextFeatureNumber` walks the existing list and adds 1 to the max. Deleting a feature does NOT decrement the next number, by design (matches Spec Kit's branch convention).
- Slug stays short (40 chars max) and never ends in a separator after truncation.

### UX details
- Sidebar features are full cards with a dir-name preview (`001-user-auth`) above the human title.
- Active leaf gets `aria-current="true"`. Tree sections use uppercase mono labels for an "engineering blueprint" feel.
- Modal autofocuses the title input on open; Esc and the Cancel button both close it; the Create button stays disabled until the title is non-empty.
- Phase 1's separate debounced preview signal removed — the workspace store is the single source of truth and Preact + signals + useMemo on the rendered HTML keeps re-render cost trivial.

### Tests
- Unit (Vitest, 59 passing): debounce (7), slug (14), markdown (13), state (25). State suite covers all reducers including: numbers don't recycle on delete, deleting active feature falls back to constitution, rename rejects empty input, content updates return same reference when nothing changed.
- e2e (Playwright, 7 passing): app shell + constitution active by default; add feature → spec/plan/tasks seeded and active; sequential numbering; doc switching swaps editor and preview; edits preserved across switches; delete preserves remaining numbers and assigns the next unused number; XSS escape on raw HTML paste.

### Bundle
- App JS: **202.4 KB brotli** (limit: 350 KB) — +7 KB from Phase 1 for the sidebar/modal/state code.
- App CSS: 2.04 KB brotli (limit: 20 KB).

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (59 passed) ✓
- `vite build` ✓
- `size-limit` (202.4 KB / 350 KB) ✓
- `playwright test` (7 passed) ✓

## [0.1.0] - 2026-05-07 — Phase 1: Skeleton + single-doc editor

### Added
- CodeMirror 6 markdown editor mounted in the centre pane (`src/components/Editor.tsx` + `src/core/editor-setup.ts`). Markdown language support, history, bracket matching, line wrapping, custom highlight style for headings/strong/emphasis/links/code, and an inline theme that pulls from CSS custom properties so light/dark switching is automatic.
- markdown-it preview in the right pane (`src/components/Preview.tsx` + `src/utils/markdown.ts`). Configured with `html: false` (no raw HTML in user content), `linkify: true`, `breaks: false`, fuzzy email matching disabled, and external links forced to `target="_blank" rel="noopener noreferrer"`.
- Debounced render at 100 ms so the preview keeps up without thrashing on every keystroke.
- Hardcoded `welcome.md` seed content imported via Vite's `?raw` (proves the pattern Phase 2 will use for the real templates).
- Visible three-pane shell with real styling: monospace editor, prose preview, sidebar placeholder. Both themes wired through CSS custom properties.
- TypeScript ambient declaration for `*.md?raw` imports.

### Why it matters
First user-visible surface. Anyone landing on the deployed site can already type markdown and watch it render — that's the core loop the rest of the project decorates.

### Architecture
- `src/utils/` holds pure helpers (`debounce`, `markdown`). Exhaustively unit-tested.
- `src/core/editor-setup.ts` owns the CodeMirror extension array — kept out of the component so future phases can swap themes or extensions without touching the wrapper.
- `src/components/Editor.tsx` mounts CM6 once and lets it own its document. Doc switches in Phase 2 will dispatch transactions rather than remount.
- `src/app.tsx` keeps a single `previewDoc` signal that the Preview subscribes to. Editor writes to a debounced setter; App does **not** re-render on every keystroke.

### UX details
- Editor caret and selection use the accent-soft palette so they stay legible in both themes.
- Preview uses a 70-char measure for readable prose; mono for headings reinforces the "engineering blueprint" aesthetic.
- Custom scrollbar in the editor matches the border-strong token.

### Tests
- Unit (Vitest, 20 passing): `debounce` (7) + `renderMarkdown` (13). The markdown suite covers `html: false`, linkify, breaks, link rels, escaping of mixed HTML+markdown.
- e2e (Playwright, 4 passing): app shell renders at the configured base path; seeded welcome content visible; typing → preview updates; raw `<script>` paste does not execute and is escaped in the preview.

### Bundle
- App bundle: **195.2 KB brotlied** (limit: **350 KB**)
- App CSS: 1.35 KB brotlied (limit: 20 KB)
- Vite source-map size warning silenced via `chunkSizeWarningLimit: 800` — size-limit is the source of truth.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (20 passed) ✓
- `vite build` ✓
- `size-limit` (195.2 KB / 350 KB) ✓
- `playwright test` (4 passed) ✓

### Size-limit budget bump
Bumped from 200 KB → **350 KB** in this phase. CodeMirror 6 lands at 176 KB gz on its own; bumping deliberately to absorb Phase 4 (JSZip, ~30 KB) without per-phase scrambles. Hard ceiling per IMPLEMENTATION_PLAN.md remains 500 KB total.

## [Phase 0] — Pre-flight (no version tag)

Project scaffold. No user-facing surface yet.

- Vite + Preact + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- `@preact/preset-vite`, `preact/compat` aliases for the React ecosystem
- ESLint flat config (TypeScript-aware), Prettier, EditorConfig
- Vitest with jsdom environment for unit tests
- Playwright smoke harness against `vite preview`
- size-limit configured against `dist/assets/*.{js,css}` (200 KB / 20 KB gz)
- GitHub Actions workflow: build → typecheck → lint → format:check → test → build → size → deploy to Pages, with Playwright run as a parallel job
- Repo dotfiles: `.nvmrc` (Node 20), `.gitignore`, `.editorconfig`, `.prettierrc`, `.prettierignore`
- MIT license, README scaffold, dogfooded `.specify/` directory based on `IMPLEMENTATION_PLAN.md`
- Placeholder three-pane layout in `src/app.tsx`; styling tokens for both light and dark modes seeded

## [0.1.0] - TBD — Phase 1: Skeleton + single-doc editor

(empty until Phase 1 ships)
