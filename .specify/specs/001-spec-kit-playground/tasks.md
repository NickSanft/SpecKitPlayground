# Feature 001 — Tasks

Tracked at the phase level. Each phase is one ship cycle (implement → tests → pre-push → commit → push → CI green → tag → next phase).

Status legend: `[ ]` not started, `[~]` in progress, `[x]` shipped (CI green + tagged).

## Phase 0 — Pre-flight scaffold (untagged)

- [x] Create public GitHub repo `NickSanft/SpecKitPlayground`
- [x] Local `git init`, remote, `main` default branch
- [x] Vite + Preact + TS strict project skeleton
- [x] Runtime deps: `preact`, `@preact/signals`, CodeMirror 6 set, `markdown-it`, `jszip`, `idb-keyval`
- [x] Dev deps: Vitest, Playwright, size-limit, ESLint, Prettier, tsx
- [x] `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- [x] ESLint flat config, Prettier, EditorConfig
- [x] Vitest jsdom env config
- [x] Playwright config against `vite preview`
- [x] size-limit budget: 200 KB gz JS, 20 KB gz CSS
- [x] `vite.config.ts` with `base: '/SpecKitPlayground/'` and `manualChunks` for CodeMirror
- [x] `index.html`, blank-shell `app.tsx`, CSS tokens for both themes
- [x] `.github/workflows/deploy.yml` with build → typecheck → lint → format:check → test → build → size → deploy, plus parallel Playwright job
- [x] `.nvmrc` (Node 20), `.gitignore`, `.editorconfig`, `.prettierrc`
- [x] MIT `LICENSE`, README scaffold, `CHANGELOG.md` scaffold
- [x] `scripts/sync-templates.ts`; first run synced 4 canonical templates
- [x] Dogfooded `.specify/` directory (this file)
- [ ] Local preflight green (`npm run preflight`)
- [ ] First commit + push to `main`
- [ ] GitHub Pages enabled and first deploy green

## Phase 1 — Skeleton + single-doc editor (v0.1.0)

- [ ] Three-pane Grid shell, real CSS (no boilerplate text)
- [ ] CodeMirror 6 editor mounted with markdown language and theme
- [ ] markdown-it preview pane with `html: false`
- [ ] Single hardcoded "Welcome.md" string
- [ ] Debounced re-render at 100 ms; debounce util unit-tested
- [ ] Playwright smoke: type → preview updates
- [ ] Bundle measured; size-limit budget bumped to a deliberate value
- [ ] Tag `v0.1.0` on CI green

## Phase 2 — Domain + nav (v0.2.0)

- [ ] `core/types.ts` with `Workspace`, `Feature`, `Document`
- [ ] `core/state.ts` signals store; reducers unit-tested
- [ ] `utils/slug.ts` with full unit coverage
- [ ] Sidebar tree with Memory and Specs sections
- [ ] `NewFeatureModal` flow with template seeding from `src/templates/*.md` (`?raw` import)
- [ ] Rename and delete features
- [ ] Active doc highlighting; full keyboard navigation
- [ ] Playwright smoke: add feature → switch docs → edit each
- [ ] Tag `v0.2.0` on CI green

## Phase 3 — Persistence (v0.3.0)

- [ ] `core/storage.ts` over `idb-keyval`, single key `spk:workspace:v1`
- [ ] Auto-save debounced 500 ms
- [ ] `deserializeWorkspace()` with back-compat field defaults
- [ ] "Saving… / Saved <relative time>" pill in header
- [ ] First-run empty state with create-workspace CTA
- [ ] Hidden settings menu with reset (confirm dialog)
- [ ] Playwright smoke: edit → reload → persists
- [ ] Tag `v0.3.0` on CI green

## Phase 4 — Export (v0.4.0)

- [ ] `core/export.ts` with `buildZip(workspace, opts)` returning `Promise<Blob>`
- [ ] Zip structure matches `specify init` output exactly
- [ ] Top-level `README.md` in the zip explaining how to drop it into a project
- [ ] Export modal with file-tree preview, "include templates" toggle, "skip empty features" toggle
- [ ] Per-doc copy-to-clipboard and download `.md` buttons
- [ ] Unit tests for the zip-tree assembler (don't actually unzip; assert on the JSZip tree)
- [ ] Playwright smoke: export → blob downloads
- [ ] Tag `v0.4.0` on CI green

## Phase 5 — Polish (v0.5.0)

- [ ] Light/dark theme toggle wired through `<html data-theme>`
- [ ] Keyboard shortcuts: ⌘S, ⌘E, ⌘B, ⌘P, ⌘N
- [ ] Help modal with shortcut list, SDD blurb, attribution
- [ ] Accessibility pass: keyboard everywhere, ARIA labels, focus-visible, contrast in both themes, `prefers-reduced-motion`
- [ ] Responsive mobile tab bar (< 768 px)
- [ ] Loading skeleton during IndexedDB hydration
- [ ] README with hero screenshot and live demo link
- [ ] Favicon polish, OG image
- [ ] Lighthouse ≥ 95 across all four categories on the deployed site
- [ ] Tag `v0.5.0` on CI green

## Phase 6 — Stretch: lint panel (v0.6.0)

- [ ] `Rule` interface with `id`, `severity`, `appliesTo`, `check`
- [ ] Initial rule set (5+): constitution principle count, spec missing user-stories section, plan refers to libraries not in spec, etc.
- [ ] Lint panel UI; toggle in toolbar
- [ ] Tag `v0.6.0` on CI green

## v1.0.0 cut

- [ ] §11 DoD checklist fully checked
- [ ] One stretch feature (lint panel) shipped
- [ ] Annotated tag `v1.0.0`
