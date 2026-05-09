# Changelog

All notable changes to Spec Kit Playground are tracked here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); pre-1.0 versioning uses minor = phase number per the project's per-phase ship workflow.

## [Unreleased]

(empty)

## [1.6.0] - 2026-05-09 — Phase 12: Configurable lint rules

### Added
- **`Workspace.lintConfig: { disabled: string[] }`** field, optional. Older v1.0–v1.5 records hydrate with no `lintConfig` (= all rules enabled), so this is purely additive on the wire format.
- **`isRuleEnabled(workspace, ruleId)`** helper in `lint.ts`. `lintWorkspace` now skips disabled rules entirely — they don't run, don't produce diagnostics, and don't count towards the header pip.
- **`setLintRuleEnabled(workspace, ruleId, enabled)`** pure reducer. Reference-stable when nothing actually changes; never double-adds the same rule to the disabled list.
- **`commitSetLintRuleEnabled(ruleId, enabled)`** thunk; auto-save persists the change like any other workspace mutation.
- **Configure tab** in `LintPanel.tsx` — split into a Diagnostics view and a Configure view via `role="tablist"`. The Configure view lists every rule with its description and a checkbox; toggling commits immediately. The Diagnostics tab shows a count badge in its label so the user can see the impact at a glance.
- **Storage round-trip** for `lintConfig`: persisted only when at least one rule is disabled, so the wire format stays minimal in the common case. Defensive `deserializeLintConfig` drops non-string entries and returns `undefined` for empty / malformed input.

### Why it matters
Phase 6's six rules are heuristics, not laws. The `feature-untouched` rule is genuinely useful for solo workflows but noise for "I'm reviewing someone else's spec"; `needs-clarification` matters before export but distracting while drafting. Per-workspace toggles let users keep rules that match the work they're doing without the noise of rules that don't.

### Architecture
- **The wire format only persists what diverges from default.** `serializeWorkspace` omits `lintConfig` entirely when no rules are disabled. `deserializeLintConfig` returns `undefined` for the default case. No "explicit empty array" overhead.
- **The rule registry stays a constant** — disabling a rule doesn't unregister it; it's a per-workspace filter on top of the same global rule set. Means rules can come and go across versions without invalidating workspace data.
- **The Configure view is a sibling tab in the same panel**, not a separate modal. Keeps the path "see diagnostic → click Configure → toggle → see effect" one click away.

### UX details
- The Diagnostics tab label shows `(N)` when there are issues, so the user sees both tabs and the count without having to switch.
- Each Configure row uses a labeled checkbox with the rule id (mono) above the human description (sans). Aria label reads as "Disable rule X" or "Enable rule X" depending on current state.
- Disabled rules have no visual representation in the diagnostics list at all — no greyed-out row, no "Hidden by config" footer. Off means off.

### Tests
- Unit (Vitest, **176 passed**, +8): `setLintRuleEnabled` covers add, remove, no-op same-reference, no double-add. `lintWorkspace` covers respecting and re-enabling rule config. Storage covers `lintConfig` round-trip and the omit-when-empty wire-format invariant.
- e2e (Playwright × Chromium + WebKit, **54 passed**, +1): add an unedited feature so multiple diagnostics fire, capture the initial pip count, switch to Configure, disable `feature-untouched`, switch back to Diagnostics, verify the disabled rule's diagnostic is gone but other rules' diagnostics remain, close the modal, assert the pip count dropped by exactly 1.

### Bundle
- App JS: **242.4 KB brotli** (limit: 350 KB) — +0.5 KB for the config UI and reducer.
- App CSS: **4.50 KB brotli** (limit: 20 KB) — +0.2 KB for tabs and the rule-toggle list.
- Lighthouse unchanged: 100 / 95 / 100 / 100.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (176 passed) ✓
- `vite build` ✓
- `size-limit` (242.4 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (54 passed; Firefox runs in CI) ✓
- `lhci autorun` ✓

### Wire-format note
`lintConfig` is the second additive field on `Workspace` since v1.0 (the first was `Document.baseline` in v1.4.0). Per the project's wire-format rule, `deserializeWorkspace` returns a workspace with `lintConfig` undefined when missing/invalid, which means all rules are enabled by default — same behaviour Phase 6 shipped. Storage's `serializeWorkspace` only emits `lintConfig` when at least one rule is disabled.

## [1.5.0] - 2026-05-09 — Phase 11: Search across docs

### Added
- **`src/utils/search.ts`** — pure case-insensitive substring search across the constitution and every feature's spec/plan/tasks. Returns `SearchResult[]` with the target `ActiveDocId` (so click-to-navigate is one `commitSetActiveDoc` call), a human label like `"spec.md — User Auth"`, the 1-based line number, and a snippet `{ before, match, after }` with `…` ellipses on long lines. Capped at 100 results to keep degenerate queries (single space, single letter) from flooding.
- **`SearchPanel.tsx`** — modal opened by `⌘⇧F` (or `Ctrl+Shift+F`). Autofocused input, live results, mouse-hover and keyboard-arrow selection (↑/↓), Enter to open, Escape to close. Highlights the matched substring in each result with `<mark>`.
- **Shortcut binding** added to `App.tsx` and exposed in the help modal alongside the others.

### Why it matters
Multi-feature workspaces grow fast — once you have 3+ features each with three docs, scanning the sidebar for a half-remembered phrase is friction the editor was originally designed to avoid. Search makes the workspace feel like one document at the keyboard while keeping the multi-doc structure on screen.

### Architecture
- The search runs synchronously on every keystroke; `useMemo` keys it on `[workspace, query]`. For typical workspace sizes (a few features × a few KB each) it's <1 ms; the 100-result cap protects against pathological inputs.
- Substring not regex, deliberately. Regex is more powerful but more surprising for non-developers; can be added behind a toggle if requested.
- `searchWorkspace` walks docs in a fixed order (constitution, then features by storage order, then doc kind in spec → plan → tasks). Result order is stable, which makes the keyboard-driven workflow predictable.
- The panel's `aria-selected` mirrors the keyboard `activeIndex` so screen readers announce the active row.

### UX details
- The result list is a 3-column grid: target label (mono, muted), snippet (mono, with the match highlighted), line number (small, mono). Each row truncates with ellipses to keep the panel readable on narrow screens.
- The hint line below the input cycles through three states: empty query → "Substring match, case-insensitive…", no matches → "No matches.", matches → "N matches" (or "100+" at the cap).
- Hovering a result also moves the keyboard selection so mouse + keyboard agree on which row is "active".
- The matched substring uses the same warning-tinted highlight as the lint diagnostic snippets, for visual consistency across panels.

### Tests
- Unit (Vitest, **168 passed**, +9): empty query → empty; single match in constitution; case-insensitive matching but original casing preserved in `snippet.match`; multi-doc results; multiple matches per line are emitted separately; no-match returns empty; result cap; long-line ellipsis behaviour; 1-based line numbering.
- e2e (Playwright × Chromium + WebKit, **52 passed**, +1): edited spec contains a unique probe token; navigating away from that doc, opening the search panel via the keyboard shortcut, querying the token, and clicking the result navigates back to the spec.

### Bundle
- App JS: **241.9 KB brotli** (limit: 350 KB) — +0.7 KB for the search util and modal.
- App CSS: **4.27 KB brotli** (limit: 20 KB) — +0.2 KB for the result-row grid and snippet highlight.
- Lighthouse unchanged: 100 / 95 / 100 / 100.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (168 passed) ✓
- `vite build` ✓
- `size-limit` (241.9 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (52 passed; Firefox runs in CI) ✓
- `lhci autorun` ✓

## [1.4.0] - 2026-05-09 — Phase 10: Diff view

### Added
- **`baseline?: string`** field on `Document`. Tracks "what the doc looked like at the last meaningful checkpoint" so the diff view has something to compare against. Storage round-trips it explicitly when it differs from `content` (so the on-disk record stays small for the common no-edits case).
- **`src/utils/diff.ts`** — hand-rolled line-level diff via standard LCS. Returns a sequence of `DiffLine[]` ops (`equal` / `added` / `removed`) with 1-based line numbers in both baseline and current. `summarizeDiff(diff)` totals the counts; `hasChanges(a, b)` is a constant-time identity check used by the indicator. ~80 lines, no new deps.
- **`DiffView.tsx`** — replaces the editor pane when the user toggles diff mode. Renders `+ added`, `− removed`, ` equal` lines with green/red gutter colors and a header summary. Empty state when baseline equals current.
- **DocActions toolbar grew two buttons**:
  - **Diff / Editing view** — toggles the editor mode; persisted as a module-level signal so it survives doc switches.
  - **Mark baseline** — disabled when there's nothing to baseline (i.e., `baseline === content`).
- **Header changed-doc pip** — only renders when at least one doc differs from baseline. Shows `N changed` with warning palette + tooltip listing the count. Implemented as a `computed(() => countChangedDocs(workspaceSignal.value))`.
- **Reducers**: `markActiveDocAsBaseline`, `markAllDocsAsBaseline`. `commitCreateWorkspaceFromShared` now passes the imported workspace through `markAllDocsAsBaseline` so the receiver starts with a clean slate (no diff against the sender's old baseline).
- **`updateActiveDocContent`** preserves `baseline` (and any other fields) instead of replacing the whole doc — this was a latent bug that would have manifested once Phase 10 landed, but didn't trip earlier tests because no other field had been added yet.

### Why it matters
Self-review before exporting or sharing. The pip in the header is a passive nudge ("you have unsaved changes since you last marked a baseline"); the diff view is the active surface. The combination turns "did I change anything important since last time?" from a memory exercise into one click.

### Architecture
- **The diff is computed, not persisted.** Only `baseline` is persisted; the diff itself is recomputed on every render via `useMemo` in `DiffView`. This keeps the wire format small and avoids cache-invalidation bugs.
- **Baseline lifecycle**: set on workspace creation (= template content), on every doc when imported (= imported content), and explicitly via "Mark baseline". NOT touched on export — the user might want to compare exports across time.
- **The diff util is O(m·n) memory and time.** Acceptable for typical document sizes; a Myers-style algorithm would be needed for very large docs (>10 K lines), out of scope for v1.4.
- **`editorMode` lives at module level** (in `DocActions.tsx`) rather than App state. This is so the diff toggle survives doc switches — the user can flip to diff, click around the sidebar, and stay in diff view.

### UX details
- Diff line backgrounds use the existing success/danger token palette at low opacity, so they read as subtle highlights even in dark mode.
- The Mark-baseline button is disabled when baseline already equals content, to make the empty-state self-explanatory rather than letting the user click a no-op button.
- Empty state in the diff view is verbose enough to explain WHEN the baseline updates (creation, import, explicit mark) so the user understands the semantics.
- The header pip uses the warning palette to differentiate it from the lint pip (which uses severity-specific colors).

### Tests
- Unit (Vitest, **159 passed**, +13): `diffLines` covers identical input, additions, removals, full replacement, empty baseline / current / both, line-number tracking, and a 200-line stress case; `summarizeDiff` and `hasChanges` covered too.
- e2e (Playwright × Chromium + WebKit, **50 passed**, +1): edit constitution → open diff → see `+ added` lines + header pip; click Mark baseline → diff goes empty + pip disappears; switch back to edit, change again, switch to diff → see the new change highlighted with the previous body in `−` and new body in `+`.

### Bundle
- App JS: **241.2 KB brotli** (limit: 350 KB) — +1.2 KB for the diff util, view component, and DocActions buttons.
- App CSS: **4.04 KB brotli** (limit: 20 KB) — +0.3 KB for the diff line palette and changed-pip styles.
- Lighthouse unchanged: 100 / 95 / 100 / 100.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (159 passed) ✓
- `vite build` ✓
- `size-limit` (241.2 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (50 passed; Firefox runs in CI) ✓
- `lhci autorun` ✓

### Wire-format note
`baseline` is the first additive field on `Document` since v1.0. Per the project's wire-format rule, `deserializeDocument` defaults it to current `content` when missing, so older Phase 1–9 records hydrate as "no diff yet" rather than being rejected. Storage's `serializeDocument` only emits `baseline` when it differs from `content`, so the persistent record stays small for the common no-edits case.

## [1.3.0] - 2026-05-09 — Phase 9: Round-trip (import + combined-markdown export)

**Bundles features 4 + 10 from the post-v1 roadmap** (drag-and-drop import + single-combined-markdown export). Both touch the same wire format and were grouped to ship one round-trip surface.

### Added
- **Combined-markdown format** — a single `.md` file containing the whole workspace, delimited by HTML-comment markers that don't render in markdown previews but are machine-readable:
  ```
  <!-- spk:workspace name="My Project" v="1" -->
  <!-- spk:constitution -->
  ...
  <!-- spk:feature number="1" slug="auth" title="Auth" doc="spec" -->
  ...
  ```
  Attribute values are JSON-encoded so quotes, backslashes, and unicode survive round-trip.
- **`buildCombinedMarkdown(workspace, options)`** in `src/core/export.ts` — produces the format above. Respects `includeEmptyFeatures` (templates folder option doesn't apply since the format is self-contained).
- **`Single combined .md`** as a new format option in `ExportModal.tsx`. The modal now has two `<fieldset>`s — Format (zip vs combined-md) and Contents (templates / empty features), with templates greyed out for combined-md since it's not applicable.
- **`src/core/import.ts`** — pure parsers that turn external files back into a `Workspace`:
  - `parseCombinedMarkdown(text)` — walks the marker stream, accumulates per-doc bodies, returns null when no markers are present, fills missing feature docs with template content. CRLF-tolerant.
  - `parseSpecifyZip(file)` — walks a JSZip-loaded archive, accepts both root-level `.specify/` and zips nested under a wrapper directory, derives a Title-Cased title from the directory slug. Returns null when neither a constitution nor any feature docs are found.
  - `importFromFile(file)` — best-effort dispatch by extension/MIME, falling back to text/markdown.
- **`DropZone.tsx`** — full-app drag-and-drop overlay listening on `document` for `dragenter`/`dragleave`/`dragover`/`drop`. Uses an enter/leave counter so the overlay stays visible across nested elements. On drop, parses the file via `importFromFile` and stages the result in `pendingSharedWorkspace`. A transient error toast shows for 5 s on parse failure.
- **`pendingSharedWorkspace` extended** to carry an `ImportSource` (`'url' | 'zip' | 'combined-md'`). The same `ImportPreviewBanner` now renders for all three sources with source-specific intro copy. Only the URL source strips the location fragment on import/dismiss.
- **`commitCreateWorkspaceFromShared`** continues to be the import sink — mints fresh ids and timestamps regardless of source so imports never collide with existing IDB records.

### Why it matters
Closes the round-trip loop. Phase 4 added export; Phase 8 added URL sharing for short snapshots; this phase makes the in/out paths symmetric. You can hit Export → "Single combined .md", paste the markdown into a chat or gist, then drop it back onto the app on another machine and pick up where you left off — no zip tooling required.

### Architecture
- The combined-md format is a wire format; the marker grammar is documented in `export.ts` and parser is in `import.ts`. Attributes use JSON-encoded values so the format is unambiguous about quoting.
- Drop handling lives in a single component bound to `document`-level events, not a per-element drop target. This means the user can drop anywhere on the page, including over an open modal, and the import flow takes over.
- `parseSpecifyZip` does a two-pass walk (dirs first, then files) so a feature directory's slug is registered even when the spec/plan/tasks files are absent — robust against partial exports.
- All parsers go through `deserializeWorkspace`-style defenses: malformed input returns `null` rather than throwing.

### UX details
- The drop overlay is dimmed-backdrop + dashed-accent card so it's unmistakable when the user drags a file over the page.
- Export modal hides the file-tree preview when the combined-md format is selected (no tree to show).
- Combined-md exported files have HTML-comment markers that gracefully degrade in any markdown viewer — they show as nothing in the rendered preview but are still there in the source.

### Tests
- Unit (Vitest, **146 passed**, +11): combined-md round-trip on multi-feature workspaces; numbering preservation across deletions; special-character escaping (`"` and `&`); null-on-no-markers; missing feature docs filled with templates; invalid feature attrs dropped; CRLF tolerance; zip round-trip via JSZip; null-on-empty-zip; nested-`.specify/` in wrappers; Title-Case title derivation from slug.
- e2e (Playwright × Chromium + WebKit, **48 passed**, +1): combined-md export downloads a file with the expected markers; that file dropped back onto the app via a synthetic `DragEvent` shows the import banner; importing it lands the workspace as active with the constitution preserved.

### Bundle
- App JS: **240.0 KB brotli** (limit: 350 KB) — +1.7 KB for the import module + DropZone + ExportModal format toggle. JSZip was already loaded for the zip export path; no new heavy deps.
- App CSS: **3.79 KB brotli** (limit: 20 KB) — +0.1 KB for the drop overlay and error toast.
- Lighthouse unchanged: 100 / 95 / 100 / 100.

### Pre-push checklist
- `tsc --noEmit` ✓ (added `DragEvent`, `File` to ESLint globals)
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (146 passed) ✓
- `vite build` ✓
- `size-limit` (240.0 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (48 passed; Firefox runs in CI) ✓
- `lhci autorun` ✓

### Wire-format note
Per the project's wire-format rule, both `parseCombinedMarkdown` and `parseSpecifyZip` are back-compat-defensive: they return `null` (not throw) on unparseable input, fill missing fields with template defaults, and drop entries with invalid number/slug/doc rather than failing the whole import. The combined-markdown format is versioned with `v="1"` in the workspace marker so future schema bumps can be detected and handled.

## [1.2.0] - 2026-05-09 — Phase 8: URL sharing

### Added
- **`src/core/share.ts`** — encode any workspace into a URL-safe, compressed token via `lz-string`'s `compressToEncodedURIComponent`, wrapped in a tiny `{ v: 1, ws: SerializedWorkspace }` envelope so the wire format is versionable. Exports:
  - `encodeWorkspaceToShareToken(ws)` → string | null
  - `decodeShareToken(token)` → Workspace | null (defends against garbage input, non-JSON payloads, mismatched envelope versions)
  - `buildShareUrl(token, baseUrl?)` → URL with `#w=…` fragment
  - `readShareFromLocation()` → reads the current `#w=` fragment
  - `clearShareFromLocation()` → strips the fragment via `history.replaceState` (no reload, no scroll jump)
- **Share button** in the header — opens `ShareModal.tsx` which auto-selects the URL field, has a Copy button (with transient "Copied" / "Copy failed" feedback), a privacy warning calling out that browser history / server logs / chat archives all see the URL contents, and a token-length stat with the ~8 K char URL-length advisory.
- **`⌘⇧S`** keyboard shortcut → opens the share modal. Listed in the help modal alongside the other shortcuts.
- **`ImportPreviewBanner.tsx`** — when the app boots with a `#w=…` fragment, the decoded workspace is staged in a `pendingSharedWorkspace` signal and the banner appears at the top of the shell. Shows the workspace name and feature count; user clicks **Import as new workspace** to materialise it (always lands as a fresh record with a new id, becomes the active workspace), or **Dismiss** to drop it. Either path strips the fragment from the URL.
- **`commitCreateWorkspaceFromShared(shared, replaceActive)`** thunk in `src/core/state.ts`. Mints a new id and timestamps so the imported workspace doesn't collide with anything already saved under the original id. Goes through the same `flushSave.flush()` → `saveWorkspace` → `saveIndex` → switch-active path as `commitCreateWorkspace`.

### Why it matters
The most "tweetable" feature on the post-v1 roadmap. Anyone can paste a workspace into a chat, GitHub gist, or PR description without the recipient needing to install anything; they paste the URL and get a one-click import path. The privacy banner is upfront — the link IS the data, treat it as public.

### Architecture
- The fragment carries the entire workspace, never the index or other workspaces. One-workspace-per-URL keeps the share-a-snapshot model unambiguous.
- The pending-import state lives at module level (`pendingSharedWorkspace` signal) rather than React state. That way `main.tsx` can populate it before the App ever renders, and the banner survives any number of unrelated re-renders without forgetting it.
- `clearShareFromLocation` uses `history.replaceState` with the bare URL — no reload, no scroll jump, no entry added to history.
- Decompression is wrapped in try/catch on every error path: garbage tokens, non-JSON payloads, version mismatches all return `null` rather than throwing.

### UX details
- The privacy warning uses the warning palette (amber border + soft amber background) so it reads as a callout, not a passive note.
- Token-length stat is prefixed with the string `"Token length:"` and uses `toLocaleString()` for thousands separators.
- The banner stacks vertically below 768 px so the buttons don't overflow on mobile.

### Tests
- Unit (Vitest, **135 passed**, +9): share-module round-trip on empty, multi-feature, and edited workspaces; URL-safe token character set; decode-of-empty/garbage/non-JSON returns null; envelope version sentinel; `buildShareUrl` formatting.
- e2e (Playwright × Chromium + WebKit, **46 passed**, +4): share modal exposes a URL containing `#w=`; opening that URL in a fresh browser context shows the import banner with the correct workspace name; clicking Import imports the workspace, makes it active, and strips the fragment; clicking Dismiss closes the banner without importing and also strips the fragment.

### Bundle
- App JS: **238.3 KB brotli** (limit: 350 KB) — +2.0 KB for `lz-string` and the share/import code (lz-string is ~3 KB minified before compression-on-the-wire).
- App CSS: **3.66 KB brotli** (limit: 20 KB) — +0.1 KB for the share modal and import banner.
- Lighthouse unchanged: 100 / 95 / 100 / 100.

### Pre-push checklist
- `tsc --noEmit` ✓ (added `location`, `history`, `URLSearchParams` to ESLint globals)
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (135 passed) ✓
- `vite build` ✓
- `size-limit` (238.3 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (46 passed; Firefox runs in CI) ✓
- `lhci autorun` ✓

## [1.1.0] - 2026-05-09 — Phase 7: Workspace identity

First minor bump after v1.0. **Bundles features 2 + 3 from the post-v1 roadmap** (rename + multiple workspaces) because they share a storage migration — splitting them would have meant migrating twice.

### Added
- **Multiple workspaces.** Storage layout migrates from a single `spk:workspace:v1` to one record per workspace at `spk:workspaces:v2:<id>` plus a small `spk:workspaces:v2:index` referencing `{ active, ids }`. The migration is idempotent and runs on first hydrate; an unrecoverable v1 record is dropped rather than retried forever.
- **Workspace switcher** in the header (`WorkspaceSwitcher.tsx`) — opens a popover listing other workspaces, with menu items for *Rename this workspace…*, *+ New workspace…*, and *Delete this workspace…*. Outside-click and Escape both dismiss the popover.
- **Inline rename** for the active workspace name in the header. Clicking *Rename this workspace…* swaps the name button for an autofocused input. Enter commits, Escape reverts. Whitespace-only or unchanged values are no-ops.
- **`commitCreateWorkspace` / `commitSwitchWorkspace` / `commitDeleteWorkspace` / `commitResetAllWorkspaces` / `commitRenameActiveWorkspace`** thunks. Each flushes or cancels the pending auto-save before swapping the active workspace, so an in-flight write to workspace A can't land after we've already switched to workspace B.
- **Settings menu's "Reset workspace…" became "Delete all workspaces…"** — wipes every record and seeds a single fresh workspace. Per-workspace deletion now lives in the switcher; this is the nuclear option.
- **`renameWorkspace` reducer** — pure, returns the same reference if the trimmed name is empty or unchanged.
- **`migrateLegacyIfNeeded`, `reconcileOrphanRecords`, `clearAllWorkspaces`** in `src/core/storage.ts`. Records orphaned from a partial delete get cleaned up best-effort on every boot.
- **`workspaceList` signal** + `listWorkspaceMetas()` for the switcher dropdown's contents.
- **`data-saved-at` and `data-active-workspace` attributes** on the app shell so e2e tests can observe save commits and active-workspace changes deterministically.
- **`tests/e2e/helpers.ts`** grows `snapshotSavedAt(page)` and `waitForSaveAfter(page, before)`. `replaceEditorContent` now waits for the save to commit before returning.
- **`fake-indexeddb`** as a Vitest setup file, so storage-IO unit tests can exercise migration and reconciliation in node.

### Fixed
- **Index key collision with the record prefix.** `INDEX_KEY = 'spk:workspaces:v2:index'` shares the prefix `'spk:workspaces:v2:'` used for workspace records, so the original `reconcileOrphanRecords` was deleting the index every boot ("id" parsed from the key was the literal string `'index'`, which isn't a known workspace id). Found via an e2e regression where reload always cold-started a brand-new workspace; pinned with a unit test that asserts reconcile leaves the index alone.
- **Race in the WorkspaceSwitcher's rename input.** A `useEffect` with `[renaming, active.name]` deps was re-resetting `draftName` to the current name whenever the signal triggered a re-render, racing with Playwright's `fill`. Removed the deps-driven reset; `useState(active.name)` already seeds the initial draft and the input becomes simply controlled.

### Why it matters
Multiple workspaces is the highest-leverage stretch goal — anyone maintaining specs for more than one project needed it. Rename comes along almost free once the storage layout supports it. This is the foundation every remaining roadmap phase (URL sharing, import, diff view, search) builds on, since they all need to know "which workspace are we operating on" without assuming there's only one.

### Architecture
- The pure reducers (`renameWorkspace`, etc.) live in `state.ts` next to the existing ones; the multi-workspace coordination (flush-then-switch, hydrate-and-fallback) lives in async thunks at the bottom of the same file. Tests stay split: pure reducers run with no IDB; thunks are exercised end-to-end in Playwright.
- The auto-save effect's `flushSave` is now module-scoped so the switch/delete thunks can call `flushSave.flush()` (commit pending edits before switching) and `flushSave.cancel()` (drop pending edits before deleting). Without this, a 500 ms in-flight save could land after the workspace has changed and corrupt the wrong record.
- Storage IO uses two-name namespaces via the `INDEX_KEY` and `RECORD_PREFIX` constants; the orphan-reconcile loop now explicitly skips `INDEX_KEY` to defend against the prefix collision documented above.

### UX details
- Switcher button shows the active workspace name with a small caret. The popover groups "Switch to" entries (only shown when there are >1 workspaces) above per-workspace actions.
- Creating a workspace prompts for a name via `window.prompt` (smallest possible UX; can be replaced with a styled modal in a later polish phase if needed).
- Deleting the last workspace doesn't leave the user stranded — a fresh seed is always created so the app always has somewhere to land.
- Inline rename selects all text on focus so the user can type-to-replace.

### Tests
- Unit (Vitest, **126 passed**, +21): added 11 new storage tests covering legacy migration round-trip, dropping unrecoverable legacy data, listWorkspaceMetas ordering and missing-id skip, reconcileOrphanRecords (including the regression-pinning "doesn't delete the index even though the prefix collides" case), index round-trip, corrupted-index handling. Added 5 `renameWorkspace` reducer tests and 5 `deserializeIndex` defensive tests.
- e2e (Playwright × Chromium + WebKit, **42 passed in CI**, +5): rename persists across reload; create + switch between two workspaces with content isolation; deleting the active workspace falls back to a remaining one; deleting the LAST workspace seeds a fresh empty one; the existing "Delete all workspaces" flow continues to work.

### Bundle
- App JS: **236.3 KB brotli** (limit: 350 KB) — +1.5 KB for the multi-workspace state, switcher, and migration code.
- App CSS: **3.54 KB brotli** (limit: 20 KB) — +0.2 KB for the switcher popover and inline rename input styles.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (126 passed) ✓
- `vite build` ✓
- `size-limit` (236.3 KB / 350 KB) ✓
- `playwright test` × Chromium + WebKit (42 passed; Firefox local still has the Windows `spawn UNKNOWN` issue, runs in CI) ✓
- `lhci autorun` (Performance 100, Accessibility 95, Best Practices 100, SEO 100) ✓

### Wire-format note
Per the project's wire-format rule, `deserializeIndex` is back-compat-defensive: missing `ids` returns null, non-string entries are dropped, an `active` that doesn't appear in `ids` falls back to the first id. The schema bump from v1 to v2 is shipped with the migration in this same phase, as required.

## [1.0.0] - 2026-05-08 — v1.0 cut

The DoD checklist from IMPLEMENTATION_PLAN.md §11 is met. Every functional phase has shipped CI-green and tagged. This release closes the three v1.0 gaps that remained after Phase 6.

### Added
- **Cross-browser e2e**: `playwright.config.ts` now runs three projects — Chromium, Firefox, WebKit — using each one's "Desktop" device profile. CI installs all three browsers and runs the full smoke suite against each.
- **`tests/e2e/helpers.ts`** with `replaceEditorContent(page, content)`. Reads `navigator.platform` from the *emulated* browser and chooses Meta vs Control for the select-all keystroke — fixes WebKit-on-Windows where Playwright emulates Mac Safari but the host is Linux/Windows.
- **Lighthouse CI** via `@lhci/cli`: `lighthouserc.json` boots `vite preview`, runs Lighthouse against the deployed bundle, and asserts Performance / Accessibility / Best Practices / SEO are all ≥0.95. New `npm run lighthouse` script and a `lighthouse` job in the GitHub Actions workflow that runs in parallel with `e2e` and uploads the HTML report as an artifact.
- **Hero screenshot** at `docs/hero.png` (1440×900, dark mode, populated workspace) referenced from the README. Generated by `tests/screenshot/hero.spec.ts` via `npm run screenshot` so the image stays reproducible. Uses CodeMirror's `?.cmView` API to set editor content directly, bypassing list-continuation auto-indent.

### Fixed (accessibility, to clear the Lighthouse 95 bar)
- `<aside role="status">` in `FirstRunBanner` was an invalid role pairing — changed to `<div role="status">` (Lighthouse: `aria-allowed-role`).
- CodeMirror's `.cm-content` had `role="textbox"` but no accessible name — added `EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor' })` (Lighthouse: `aria-input-field-name`).
- The "Download .md" button's `aria-label` did not start with the visible text — changed to "Download .md — saves the active document as a markdown file" (Lighthouse: `label-content-name-mismatch`).
- Dark-mode `--accent` was `#60a5fa` on `--accent-soft` `#1e3a8a` (4.07:1, AA fail). Bumped to `#93c5fd` for ~6.8:1 (Lighthouse: `color-contrast`).

### Bumped
- WebKit doesn't accept `clipboard-read` / `clipboard-write` permissions via `context.grantPermissions` — clipboard test now degrades gracefully: it asserts the button shows either "Copied" or "Copy failed" on every browser, then verifies clipboard contents only on Chromium where the permission grant succeeds.

### Lighthouse scores (from CI)
| Category | Score |
|---|---|
| Performance | **100** |
| Accessibility | **95** |
| Best Practices | **100** |
| SEO | **100** |

### Definition of Done — IMPLEMENTATION_PLAN.md §11
- [x] Deployed to GitHub Pages, public URL works
- [x] All Phase 1–5 acceptance criteria met
- [x] README has a screenshot and a working demo link
- [x] Lighthouse ≥ 95 across all categories
- [x] No console errors or warnings in production build
- [x] Tested on latest Chrome, Firefox, Safari (Chromium + Firefox + WebKit via Playwright in CI)
- [x] MIT license file in place
- [x] At least one stretch feature shipped (lint panel, Phase 6)

### Tests
- Unit (Vitest, **106 passed**, unchanged)
- e2e (Playwright × 3 browsers, **51 passed in CI** — 17 × Chromium, 17 × Firefox, 17 × WebKit)
- Lighthouse CI: 4 categories ≥ 95 ✓

### Bundle
- App JS: **234.8 KB brotli** (limit: 350 KB)
- App CSS: **3.37 KB brotli** (limit: 20 KB)
- 67 % of JS budget used; comfortable headroom for future stretch goals.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (106 passed) ✓
- `vite build` ✓
- `size-limit` ✓
- `playwright test` × 2 local browsers (34 passed); CI runs the third (Firefox) ✓
- `lhci autorun` (all categories ≥ 95) ✓

### Note on local development
On Windows hosts Firefox occasionally fails to launch under Playwright with `spawn UNKNOWN` — this is a known Windows-specific Firefox driver issue, not a regression in our test code. CI on Linux runs all three browsers cleanly.

## [0.6.0] - 2026-05-08 — Phase 6: Lint panel (stretch)

### Added
- **Pluggable rule interface** in `src/core/lint.ts`:
  ```ts
  interface Rule {
    id: string;
    description: string;
    check: (workspace: Workspace) => Diagnostic[];
  }
  ```
  Rules return `Diagnostic[]` — each carries an `ActiveDocId` `target` so the panel can navigate to the offending doc on click. `lintWorkspace(ws)` runs every rule and concatenates results in registration order; `diagnosticCounts(ds)` totals by severity for the header pip.
- **Six initial rules**:
  1. `constitution-not-default` — warns if the constitution is still the unedited template
  2. `constitution-principles-count` — warns if an edited constitution has fewer than 3 `### ` headings
  3. `placeholders-remain` — info when `[UPPERCASE_TOKEN]`-style placeholders survive an edit (skips Markdown link syntax `[lowercase]`)
  4. `needs-clarification` — warns whenever any doc still contains `[NEEDS CLARIFICATION ...]`
  5. `tasks-has-checkboxes` — info if an edited `tasks.md` has no `- [ ]` checklist items
  6. `feature-untouched` — info per feature whose spec/plan/tasks are all the unedited template
- **`LintPanel.tsx`** — modal listing every diagnostic with a colored severity badge, the human message, the target doc, and the rule id. Clicking a row commits a `setActiveDoc` for the target and closes the panel. Empty state: "No issues found."
- **`LintButton.tsx`** in the header — opens the panel; shows a colored pip with the diagnostic count when non-zero (worst severity wins: error > warning > info).
- **Keyboard shortcut**: `⌘⇧L` opens the lint panel. Listed in the help modal alongside the others.

### Why it matters
The validation panel turns the playground from a passive editor into an active reviewer — surface "you forgot to fill in the constitution," "this feature has no checklist yet," or "[NEEDS CLARIFICATION] markers are still in your spec" without the user having to read every doc. Rules being pluggable means future phases can add project-specific checks (e.g. plan/spec consistency, library mention cross-references) by appending to the rule list.

### Architecture
- The diagnostics signal is a `computed(() => lintWorkspace(workspaceSignal.value))` so the pip count and modal contents stay in sync with the store automatically — no explicit re-lint on edit needed.
- Each rule is self-contained: it receives the whole workspace, decides what to look at, and returns its own diagnostics. No rule registry boilerplate beyond the `rules: readonly Rule[]` array.
- Heuristics over precision: `placeholders-remain` matches a simple `\[A-Z][A-Z0-9_ ]+\]` regex which catches the upstream tokens but ignores ordinary Markdown link syntax. `tasks-has-checkboxes` accepts either `- [ ]` or `- [x]`.

### UX details
- Severity badge palette mirrors existing tokens: info uses `accent-soft`/`accent`, warning uses `warning`, error uses `danger`. The lint pip on the header button picks the worst severity present.
- Each diagnostic row is one button (the whole row), not a button-inside-a-row, so it's keyboard-friendly and works with `getByText` in tests.
- The panel uses the same wide-modal styling as the export modal — visual consistency.

### Tests
- Unit (Vitest, **106 passed**, +18): every rule has dedicated tests for the trigger and at least one no-trigger case; the registry is asserted to have unique ids; `lintWorkspace` asserted to return diagnostics in rule order; an end-to-end "fully clean workspace produces no diagnostics" test pins the no-false-positives invariant.
- e2e (Playwright, **17 passed**, +2): adding an empty feature surfaces both `constitution-not-default` and `feature-untouched`; clicking the latter navigates to its `spec.md` and closes the panel; a fully-edited workspace shows "No issues found".

### Bundle
- App JS: **234.7 KB brotli** (limit: 350 KB) — +1.0 KB for the lint module + UI.
- App CSS: **3.36 KB brotli** (limit: 20 KB) — +0.3 KB for badge palette and panel layout.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (106 passed) ✓
- `vite build` ✓
- `size-limit` (234.7 KB / 350 KB) ✓
- `playwright test` (17 passed) ✓

## [0.5.0] - 2026-05-08 — Phase 5: Polish

### Added
- **Theme system** (`src/core/theme.ts`): three modes — `system` (default, follows `prefers-color-scheme`), `light`, `dark`. Manual override persists to `localStorage` under `spk:theme`; `system` removes the stored value. A `@preact/signals` effect drives `<html data-theme>` and the `:root[data-theme='dark']` rules in `tokens.css` already shipped at Phase 1 take it from there.
- **`ThemeToggle.tsx`** in the header — single-button cycle (system → light → dark → system) with glyphs (⊙ ☀ ☾) and dynamic `aria-label` describing both the current state and the next action.
- **Keyboard shortcuts** module (`src/core/shortcuts.ts`): platform-aware (`⌘` on Mac, `Ctrl` elsewhere), skips when an editable target is focused so typing in the editor or a modal input never triggers app shortcuts. `formatShortcut` produces the labels the help modal renders.
- Bindings: `⌘E` Export, `⌘B` Toggle sidebar, `⌘P` Toggle preview, `⌘N` New feature, `⌘/` Help.
- **`HelpModal.tsx`** — opened via a `?` button in the header or `⌘/`. Brief SDD intro, link to the upstream Spec Kit, full shortcut table with `<kbd>` styling, conventions reminder (one `tasks.md`, NNN-slug numbering), source / issues links, MIT note. The footnote calls out that some browsers reserve `⌘N` for new windows and falls back to the sidebar button.
- **Layout signals** (`src/core/layout.ts`) for `sidebarVisible`, `previewVisible`, `mobilePane`. The shell uses `data-sidebar` / `data-preview` / `data-mobile-pane` attributes that CSS selectors consume — no JS-driven layout calculations.
- **Mobile tab bar** (`MobileTabBar.tsx`) — visible only below 768 px, switches between Tree / Edit / Preview as the single visible pane. App shell stacks vertically; the header wraps on the active-doc label so titles stay readable at 375 px.
- **Accessibility pass** in `reset.css`:
  - Global `:focus-visible` outline using the accent token, 2 px offset
  - `@media (prefers-reduced-motion: reduce)` shrinks all animations and transitions to ~0 ms
- All icon-only buttons now have explicit `aria-label`s (Settings, Theme toggle, Help, per-doc Copy / Download, FirstRunBanner dismiss, feature rename / delete).
- `index.html` gets `theme-color`, full Open Graph + Twitter card meta, and a more descriptive `<meta description>`.
- Modal max-height + scroll so long content (the help modal) never pushes its action button below the viewport.
- README rewritten as a portfolio-quality intro: live link up top, "What's in the box" feature list, conventions, stack with linked deps, develop / test / deploy commands, project layout pointer.

### Why it matters
Last functional phase before v1.0. The product now feels deliberate in both themes, is keyboard-driveable, narrates itself via the help modal, and survives a 375 px viewport. A non-developer landing on the page can read the help once and figure out the rest.

### Architecture
- Layout state is a tiny `signal`-backed module with public mutators (`toggleSidebar`, `togglePreview`, `setMobilePane`). The shortcut bindings call these directly; the components subscribe via signal reads.
- The shortcuts module is purely additive — it has no app-specific state. It's a `registerShortcuts(bindings)` call that returns an unregister fn. The bindings are defined in `App.tsx` next to where they're surfaced (the Help modal renders the same array).
- `data-mobile-pane` etc. on the shell mean the responsive split between desktop and mobile is entirely CSS — no `useEffect` watching window width, no media-query JS hooks.

### UX details
- Glyphs in the theme toggle change with state so the user always knows what they have AND what's next.
- `<kbd>` tags in the help modal use the mono token, with a subtle bottom-border shadow to read like a key cap.
- The mobile tab bar uses the same `accent-soft` highlighting pattern as the document tree's active leaf — visual consistency across the app.
- Modal width: standard 420 px; export and help use a `modal-wide` (560 px) variant for tabular content.

### Tests
- Unit (Vitest, **88 passed**, +3): `formatShortcut` covers single-letter, multi-modifier, multi-character (`/`) cases.
- e2e (Playwright, **15 passed**, +3): theme toggle cycles system → light → dark and the dark choice survives a reload; help modal opens via the `?` button, lists shortcuts, and the "Got it" button dismisses it; `Cmd/Ctrl+B` toggles the sidebar.

### Bundle
- App JS: **233.7 KB brotli** (limit: 350 KB) — +1.5 KB for theme + shortcuts + help + layout code.
- App CSS: **3.07 KB brotli** (limit: 20 KB) — +0.5 KB for help modal, mobile tab bar, focus rings.

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓ (added `EventTarget` to globals for the shortcuts module)
- `prettier --check .` ✓
- `vitest run` (88 passed) ✓
- `vite build` ✓
- `size-limit` (233.7 KB / 350 KB) ✓
- `playwright test` (15 passed) ✓

### Known limitations
- No loading skeleton during the IndexedDB hydrate (acceptable: the hydrate is single-digit ms; the FOUC is barely perceptible).
- No live "Saved Xs ago" ticker — the relative timestamp updates only on the next render. Acceptable; a `setInterval` for a continuously-ticking pill would create a render every second.
- Lighthouse run on the deployed site is the v1.0 sign-off, not a Phase 5 deliverable.

## [0.4.0] - 2026-05-08 — Phase 4: Export

### Added
- `src/core/export.ts` — pure tree builder + JSZip assembler. `buildExportTree(workspace, options)` returns an ordered list of `{path, content}` representing every file in the export. `buildZip(...)` calls the tree builder and feeds it to JSZip. The pure split makes the export shape unit-testable without ever generating a real zip.
- Output structure matches Spec Kit conventions exactly:
  - `.specify/memory/constitution.md`
  - `.specify/specs/NNN-slug/{spec,plan,tasks}.md` for each (non-empty) feature
  - `.specify/templates/{spec,plan,tasks}-template.md` (toggle, default on) — note the upstream `*-template.md` naming is restored on export, even though we keep them as bare names internally
  - top-level `README.md` explaining how to drop the bundle into a project
- Two export options:
  - **Include templates folder** (default on)
  - **Include empty features** (default off — features whose spec/plan/tasks all still match the templates are skipped)
- File-tree preview in the modal, regenerated reactively as the toggles change. Directories sort before files; sorted alphabetically within each level.
- `triggerBlobDownload(blob, filename)` and `downloadDocAsMarkdown(filename, content)` use the blob+anchor pattern (no File System Access API, so Firefox/Safari work).
- `workspaceFilename(workspace)` slugifies the workspace name for the zip filename, with a generic fallback for unhelpful names.
- All file content runs through `endsWithNewline()` — guarantees a trailing LF, never CRLF (matches the Phase 4 acceptance criteria).
- `src/components/ExportModal.tsx` — wide modal with the two toggles, the live tree preview, and a download button that switches to "Building…" while the zip is generated.
- `src/components/DocActions.tsx` — small toolbar above the editor with **Copy** and **Download .md** for the active document. Copy uses `navigator.clipboard.writeText` and shows transient "Copied" / "Copy failed" feedback; Download generates a per-doc filename like `001-user-auth-spec.md` so files don't collide when saved together.
- Header **Export** button opens the modal.

### Why it matters
This is the egress that turns the playground from "draft tool" into "useful artifact producer". A user can now type up a constitution, spec out a feature or two, hit Export, drop the zip into a real repo, and continue with the actual `specify` CLI / agent integration of their choice.

### Architecture
- Two layers: pure (`buildExportTree`, `buildFileTreeView`, `workspaceFilename`) and IO (`buildZip`, `triggerBlobDownload`, `downloadDocAsMarkdown`). The pure layer carries 14 of the 15 export tests; the IO layer is exercised end-to-end by Playwright via `page.waitForEvent('download')`.
- "Empty feature" detection is content-based: `spec.content === templates.spec && plan.content === templates.plan && tasks.content === templates.tasks`. No dirty flags to maintain — the comparison is the source of truth.
- The templates folder always emits the upstream content, never the user's edits — so an exported `.specify/templates/spec-template.md` matches a fresh `specify init` exactly.

### UX details
- Clicking the Export button is one click to a tree preview, not two. The toggles let the user shape the bundle before committing to the download.
- Per-doc copy gives a 1.5s "Copied" pulse; per-doc download generates a `NNN-slug-doc.md` filename so multiple downloaded docs sort and identify cleanly.
- The export modal's filename hint shows `my-project.zip` so the user knows what they're getting before they click.

### Tests
- Unit (Vitest, **85 passed**, +15): full export suite — constitution + README always present, empty-feature filtering, includeTemplates toggle, NNN-slug naming with zero-padding, gap preservation after deletion, every file ends with LF, no CRLF anywhere, multi-doc isolation, template-folder content isolation from user edits, file-tree builder shape, filename slugification with fallback.
- e2e (Playwright, **12 passed**, +3): export modal previews the tree (and reacts to toggling templates off); zip download fires with the slug filename; per-doc Copy writes the active document to the clipboard (verified via `navigator.clipboard.readText` in `page.evaluate`); per-doc Download .md downloads `constitution.md`.

### Bundle
- App JS: **232.2 KB brotli** (limit: 350 KB) — +28 KB for JSZip + export code, exactly within the budget headroom we allocated when bumping to 350 KB at Phase 1.
- App CSS: 2.62 KB brotli (limit: 20 KB).

### Pre-push checklist
- `tsc --noEmit` ✓
- `eslint .` ✓
- `prettier --check .` ✓
- `vitest run` (85 passed) ✓
- `vite build` ✓
- `size-limit` (232.2 KB / 350 KB) ✓
- `playwright test` (12 passed) ✓

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
