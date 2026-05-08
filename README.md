# Spec Kit Playground

A fully client-side editor for drafting [GitHub Spec Kit](https://github.com/github/spec-kit) artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`) in the browser. No CLI, no backend, no telemetry. When you're done, export a properly-structured `.specify/` folder as a `.zip` and drop it into a real project.

**Live:** [nicksanft.github.io/SpecKitPlayground](https://nicksanft.github.io/SpecKitPlayground/) · published from `main` after every green CI run.

## Why

Spec-Driven Development is a useful discipline. The existing toolchain assumes you want to install a CLI and bind it to an LLM agent. Sometimes you just want to draft the documents — on a tablet, in a workshop, on a locked-down machine, or before you've committed to a tool stack. This is that.

## What's in the box

- Three-pane layout: a sidebar tree (Memory + Specs), a CodeMirror 6 markdown editor, and a live markdown-it preview.
- Templates seeded from the canonical [github/spec-kit](https://github.com/github/spec-kit) at build time so new features start with the same prose as a real `specify init`.
- Add / rename / delete features with persistent numbering (`001-user-auth`, `002-export`…). Numbers never recycle, matching Spec Kit's branch convention.
- Auto-save to IndexedDB at 500 ms debounce. A "Saved Xs ago" pill in the header. Reset is one click in the settings menu.
- Export as a zip whose contents match Spec Kit's on-disk layout exactly. Toggles for "include templates folder" and "include empty features." Per-document **Copy** and **Download .md** for one-off shares.
- Light, dark, and system-following themes. Persisted across reloads.
- Keyboard shortcuts (`⌘E` export, `⌘B` sidebar, `⌘P` preview, `⌘N` new feature, `⌘/` help).
- Mobile tab-bar layout below 768 px so the app stays usable at 375 px.
- No raw HTML in the preview (`markdown-it` runs with `html: false`). External links open in a new tab with `rel="noopener noreferrer"`.

## Conventions

- **One `tasks.md` per feature** (not a folder of task files). Matches the current Spec Kit template; documented here so it doesn't surprise readers of an exported bundle.
- **Numbered feature directories** (`NNN-slug`) and never recycled. Deleting `002-foo` leaves a hole; the next feature added becomes `003-bar`.
- **Templates** live in `src/templates/` and are synced from the official repo via `npm run sync-templates`. Re-run after upstream releases to refresh the seed content; commit the result.
- **Workspace data** lives in IndexedDB under the key `spk:workspace:v1`. Schema bumps require a migration in the same phase that introduces them.

## Stack

- [Vite 5](https://vitejs.dev) + [Preact](https://preactjs.com) + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [`@preact/signals`](https://preactjs.com/guide/v10/signals/) for reactive state
- [CodeMirror 6](https://codemirror.net) for the editor (markdown language + custom highlight style)
- [`markdown-it`](https://github.com/markdown-it/markdown-it) for preview (`html: false`)
- [JSZip](https://stuk.github.io/jszip/) for export, [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) for persistence
- Vitest + Playwright for tests, [size-limit](https://github.com/ai/size-limit) for the bundle budget

## Develop

```bash
nvm use            # Node 20 (see .nvmrc)
npm install
npm run dev        # http://localhost:5173/SpecKitPlayground/
```

## Test & verify

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint .
npm run test          # vitest run (unit)
npm run test:e2e      # playwright (smoke)
npm run build         # vite build
npm run size          # size-limit (bundle budget)
npm run preflight     # full pre-push pipeline
```

The `preflight` script runs everything except Playwright in sequence. CI runs all of it.

## Deploy

Push to `main`. The [GitHub Actions workflow](.github/workflows/deploy.yml) runs preflight, builds, runs Playwright, and deploys to GitHub Pages.

## Project layout

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full plan and [CHANGELOG.md](CHANGELOG.md) for the per-phase ship log. The project is dogfooded — there's a real `.specify/` directory at the repo root with the constitution, spec, plan, and tasks for the playground itself, written as if it were the input to its own tool.

## License

[MIT](LICENSE).
