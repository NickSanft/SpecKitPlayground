# Spec Kit Playground — Project Constitution

A short, durable statement of the project's principles. These come before features, schedules, or stylistic preferences; when there's a conflict, principles win.

## Core Principles

### 1. Fully client-side, fully static
The application runs entirely in the user's browser. No backend, no auth, no server-rendered pages, no runtime API calls. The deployed artifact is a folder of static files served from GitHub Pages. This bounds the scope, keeps operating cost at zero, and lets the project survive without ongoing maintenance.

### 2. Privacy is the default, not a feature
No analytics. No telemetry. No third-party scripts. User work lives in the user's browser only (IndexedDB). The project never has the chance to misuse data because the project never sees it.

### 3. Correctness over polish, polish over scope
The application must produce output that is byte-identical in structure to what the upstream `specify` CLI would produce. Beyond that, every shipped phase must look intentional in both light and dark themes before the next phase begins. New features come behind both correctness and polish, not before them.

### 4. Phased, verifiable progress
Work is shipped in numbered phases. Each phase has explicit acceptance criteria. Each phase ends with a green CI run and an annotated tag. No phase is "almost done"; either it shipped or it didn't.

### 5. Restraint in dependencies and abstractions
Every dependency is paid for in bundle size and maintenance surface. Every abstraction is paid for in reading time. Both must justify their cost at the time they're introduced. The 500 KB gzipped budget is a forcing function for that discipline.

## Operational Rules

- **Bundle budget**: 500 KB gzipped, hard ceiling, measured by `size-limit` in CI.
- **Test discipline**: pure helpers have exhaustive unit tests; user-visible flows have a Playwright smoke. Skip e2e only when unit coverage is genuinely sufficient and document the skip in the changelog.
- **Wire-format care**: the IndexedDB-stored workspace is the wire format. Every new field gets a back-compat default in `deserializeWorkspace()`. Storage-key version bumps require migration in the same phase.
- **Templates are upstream**: seed content is pulled from `github/spec-kit@main` via a sync script. We do not invent template prose; if upstream changes, we re-sync.

## Amendments

Edits to this file require updating the version line below and noting the change in the next CHANGELOG entry.

**Version**: 1.0.0 (initial constitution)
**Ratified**: 2026-05-07
