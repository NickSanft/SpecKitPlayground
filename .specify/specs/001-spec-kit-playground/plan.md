# Feature 001 — Plan

## Architecture

A single-page Preact application. State is held in `@preact/signals` and persisted to IndexedDB via `idb-keyval`. The editor is CodeMirror 6 wired with the markdown language extension. Preview is rendered by `markdown-it` with raw HTML disabled. Export is built in-memory by JSZip and downloaded via the blob+anchor pattern (no File System Access API — keeps Firefox/Safari working).

Boundaries:
- **`src/core/`** — pure logic. Types, state, persistence, export, slug helpers. Heavily unit-tested.
- **`src/components/`** — Preact components. Wire pure logic to the DOM. Tested via Playwright smoke flows.
- **`src/templates/`** — synced markdown templates from upstream. Imported via Vite's `?raw` so they are inlined at build time.
- **`scripts/`** — build-time helpers. Not shipped to the browser.

Data model (full shape in `IMPLEMENTATION_PLAN.md` §5; summary here):
- `Workspace` — single workspace in v1, with one `constitution: Document` and an ordered `features: Feature[]`.
- `Feature` — one numbered, slugged feature with its own `spec`, `plan`, `tasks` documents.
- `Document` — `{ content: string; updatedAt: number }`. Markdown body plus a timestamp.

Storage key: `spk:workspace:v1`. Schema bumps require a migration shipped in the same phase.

## Phased delivery

| Phase | Tag | Scope |
|---|---|---|
| 0 | (untagged) | Project scaffold: Vite + Preact + TS strict, ESLint, Prettier, Vitest, Playwright, size-limit, GH Actions deploy. Dogfood `.specify/` directory. |
| 1 | v0.1.0 | Three-pane shell, single hardcoded markdown doc, CodeMirror editor, markdown-it preview, debounced live render. |
| 2 | v0.2.0 | Domain types, signals-based store, sidebar tree, add/rename/delete features, document switching, template-seeded content. |
| 3 | v0.3.0 | IndexedDB persistence with debounced auto-save; "Saving…/Saved" indicator; empty state on first run; reset action. |
| 4 | v0.4.0 | Zip export with structure preview and toggles; per-doc copy-to-clipboard and download. |
| 5 | v0.5.0 | Theme toggle, keyboard shortcuts, help modal, accessibility pass, responsive mobile tab bar, polished README and OG image. |
| 6 | v0.6.0 | Stretch: pluggable lint panel (constitution rule count, spec-section presence, etc.). |
| — | v1.0.0 | Cut after §11 DoD is fully checked. |

## Per-phase ship loop

Every phase follows the same loop:
1. Implement scope; one commit-cycle.
2. Tests: exhaustive unit on pure helpers, Playwright smoke on the new flow.
3. Pre-push: `tsc --noEmit` → `eslint .` → `prettier --check .` → `vitest run` → `playwright test` → `vite build` → `size-limit`. All green.
4. Commit (HEREDOC, `Co-Authored-By` trailer).
5. Push to `main`.
6. Watch CI in the background; do not start the next phase until green.
7. Tag annotated `vX.Y.Z` after CI green.
8. Roll into the next phase.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Bundle exceeds 500 KB gz when CodeMirror lands | Medium | `manualChunks` to split CM out; measure each phase; bump size-limit deliberately, not reactively. |
| IndexedDB schema drift breaks existing users | Low (single-user, low traffic) | `deserializeWorkspace()` with field defaults; bump key version only when migration is unavoidable. |
| GH Pages base path mismatches dev | Low | `vite.config.ts` `base` set to `/SpecKitPlayground/`; Playwright `baseURL` matches the previewed path. |
| Upstream Spec Kit templates diverge from what we ship | Medium-low | `npm run sync-templates` re-syncs on demand; CI does not block on drift, but releases re-run it. |
| Markdown preview XSS via paste | Avoided | `markdown-it` configured with `html: false`; no `unsafe-eval`; no DOMPurify needed. |

## Testing strategy

- **Unit (Vitest, jsdom)** — `slug.ts`, `debounce.ts`, `state.ts` reducers, `export.ts` zip-tree assembler, any pure markdown helpers. Aim for branch coverage on these.
- **Component** — minimal; Preact components are mostly thin views over signals. Test via e2e instead of mounting in jsdom unless the component has internal logic worth isolating.
- **e2e (Playwright, Chromium)** — one smoke per phase. Type → preview updates (P1). Add feature → docs appear (P2). Edit → reload → persists (P3). Export → download present (P4). Theme toggle → re-render correct (P5).
- **Visual regression** — out of scope for v1; revisit if styling churn warrants it.

## Out of scope

See spec.md "Non-goals (v1)" — same list applies here. The plan does not introduce new scope.
