# Changelog

All notable changes to Spec Kit Playground are tracked here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); pre-1.0 versioning uses minor = phase number per the project's per-phase ship workflow.

## [Unreleased]

(empty)

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
