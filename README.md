# Spec Kit Playground

A fully client-side editor for drafting [GitHub Spec Kit](https://github.com/github/spec-kit) artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`) in the browser. No CLI, no backend, no telemetry. Export a properly-structured `.specify/` folder as a `.zip` and drop it into a real project.

> **Status:** scaffold only. Phase 0 pre-flight is complete; Phase 1 (skeleton + single-doc editor) is next. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full build plan and [CHANGELOG.md](CHANGELOG.md) for what has shipped.

## Live demo

https://nicksanft.github.io/SpecKitPlayground/ — published from `main` after every successful CI run.

## Why

Spec-Driven Development is a useful discipline; the existing toolchain assumes you want to install a CLI and bind it to an LLM agent. Sometimes you just want to draft the documents. This is that.

## Stack

- Vite + Preact + TypeScript (strict)
- `@preact/signals` for reactive state
- CodeMirror 6 for the markdown editor
- markdown-it for preview (with `html: false` — no raw HTML in user content)
- JSZip for export
- idb-keyval for persistence (IndexedDB)
- Vitest + Playwright for tests; size-limit for bundle budget

## Conventions

- One `tasks.md` per feature (not a folder of task files). Matches the current Spec Kit template shape; documented here so it does not surprise readers.
- Templates live in `src/templates/` as `.md` files, synced from the official Spec Kit repo via `npm run sync-templates`. Re-run after upstream releases to refresh seed content.
- Workspace data lives in IndexedDB under the key `spk:workspace:v1`. Schema bumps go through a migration in the same phase that introduces them.

## Develop

```bash
nvm use            # Node 20 (see .nvmrc)
npm install
npm run dev        # http://localhost:5173/SpecKitPlayground/
```

## Test & verify

```bash
npm run typecheck
npm run lint
npm run test            # Vitest (unit)
npm run test:e2e        # Playwright (smoke)
npm run build
npm run size            # size-limit budget
npm run preflight       # full pre-push pipeline
```

## Deploy

Push to `main`. CI builds, runs the full pre-push pipeline, and deploys to GitHub Pages.

## License

[MIT](LICENSE).
