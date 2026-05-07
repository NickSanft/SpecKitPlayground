# Feature 001 — Spec Kit Playground (the application itself)

## Summary
A browser-based editor for drafting GitHub Spec Kit artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`) without installing the `specify` CLI or any agent integration. When the user is satisfied, they export a properly-structured `.specify/` folder as a `.zip` and drop it into a real project.

## Audience
Developers who:
- Have heard about Spec-Driven Development and want to try it without CLI install
- Prefer a structured editor to a chat interface for spec authoring
- Need to draft specs offline, on a locked-down machine, or on a tablet
- Want to teach SDD in a workshop without per-attendee setup overhead

## User stories

### Drafting a workspace from scratch
**As** a developer evaluating SDD,
**I want** to open the playground in my browser and start typing into a constitution and spec,
**so that** I can see what Spec-Driven Development feels like before committing to the toolchain.

Acceptance:
- The first visit shows an empty-state CTA to create a workspace.
- A new workspace seeds `constitution.md` from the canonical template.
- Adding a feature seeds `spec.md`, `plan.md`, and `tasks.md` from canonical templates.

### Iterating across multiple documents
**As** a workshop attendee,
**I want** to switch between docs in a sidebar and edit each independently,
**so that** I can build up a full spec set without losing my place.

Acceptance:
- Sidebar lists Memory > constitution and Specs > each feature with its three docs.
- Selecting a document swaps the editor and preview panes to that document.
- The active document is visually marked.

### Surviving a refresh
**As** a user on a flaky connection or distracted by another tab,
**I want** my edits to survive a refresh,
**so that** I never lose work I have not explicitly exported.

Acceptance:
- Edits auto-save to IndexedDB within 500 ms of inactivity.
- A "Saved" / "Saving…" indicator is visible without being intrusive.
- Reload restores the workspace exactly.

### Exporting to a real project
**As** a developer ready to commit,
**I want** to download a `.zip` containing a properly-structured `.specify/` folder,
**so that** I can drop it into my project repo and continue with the real CLI/agent workflow.

Acceptance:
- The zip's structure matches the upstream `specify init` output exactly.
- Empty features can be excluded from the export (toggle).
- All files use `\n` line endings.

### Sharing a single document
**As** a developer pasting a spec into a Slack thread or PR description,
**I want** a one-click copy-to-clipboard for the current document,
**so that** I can share it without exporting the whole workspace.

Acceptance:
- The active document has a copy button in its toolbar.
- The button gives clear feedback on success and on clipboard-permission failure.

## Non-goals (v1)
- AI features of any kind (no LLM in the browser, no API calls).
- Server-side state, accounts, or collaboration.
- Real git integration. We mimic Spec Kit's branch convention, not its tooling.
- Importing arbitrary existing `.specify/` directories. Stretch goal at most.
- Mobile-first design. Desktop-first; mobile is usable but not optimized.

## Constraints
- Bundle ≤ 500 KB gzipped (initial load).
- Lighthouse ≥ 95 across Performance, Accessibility, Best Practices, SEO.
- Static-only deployment to GitHub Pages.

## Out-of-scope edge cases (v1)
- Workspaces > ~1 MB serialized (IndexedDB handles it; UI may not be tested at that scale).
- Concurrent edits across browser tabs (single tab assumed).
- Importing arbitrary markdown into a feature slot.

## Open questions
None at v1 cut. Stretch goal #1 (lint panel) is the prioritized v0.6.0 surface.
