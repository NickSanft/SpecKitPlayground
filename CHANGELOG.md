# Changelog

All notable changes to Spec Kit Playground are tracked here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); pre-1.0 versioning uses minor = phase number per the project's per-phase ship workflow.

## [Unreleased]

### Phase 0 — Pre-flight (no version tag)

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
