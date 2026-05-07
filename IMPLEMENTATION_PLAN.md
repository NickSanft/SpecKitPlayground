# Spec Kit Playground — Build Plan

> A handoff document for Claude Code. Read this top-to-bottom before starting.
> If you find anything ambiguous, ask the human before guessing — but use your judgement on tactical decisions (variable names, file boundaries, micro-UX).

---

## 1. Vision

**Spec Kit Playground** is a fully client-side web app that lets developers draft GitHub Spec Kit artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks/`) in the browser without installing the `specify` CLI or the various slash-command integrations. When they're happy, they can export a properly-structured `.specify/` folder as a `.zip`, drop it into a real project, and continue from there.

The audience is developers who:

- Heard about Spec-Driven Development but don't want to install a CLI just to try it
- Want a visual, structured editor instead of a chat interface for spec authoring
- Need to draft specs offline / on a locked-down machine / on a tablet
- Want to teach SDD concepts in a workshop without setup overhead

**This is a portfolio project.** Polish matters. The bar is "would I link this on my résumé," not "does it technically work."

---

## 2. Non-Goals

To keep scope tight, the following are explicitly **out of scope** for v1:

- Running an LLM in-browser or calling any AI API (no AI features at all in v1)
- Server-side anything — no backend, no auth, no accounts
- Real git integration (we will *mimic* Spec Kit's git-branch convention, not actually use git)
- Importing arbitrary existing projects (a stretch goal at most)
- Real-time collaboration (single-user only)
- Mobile-first design (desktop-first; mobile should be usable but not optimized)

---

## 3. Tech Stack

Required:

- **Vite** as the build tool
- **TypeScript** with strict mode on
- **Preact** for the UI layer (3KB, React-compatible JSX, ideal for static hosting). Use `@preact/signals` for reactive state — it's clean and avoids the boilerplate of `useState` everywhere.
- **CodeMirror 6** for the markdown editor (`@codemirror/lang-markdown`, `@codemirror/theme-one-dark` or similar)
- **markdown-it** for rendering preview HTML (with `markdown-it-anchor` for heading IDs)
- **JSZip** for the export bundle
- **idb-keyval** as a thin wrapper over IndexedDB for persistence

Optional:

- A small CSS framework if you want — but **prefer hand-rolled CSS with custom properties for theming**. No Tailwind. No shadcn. Keep the bundle small and the aesthetic distinctive.
- `dompurify` if you allow rendered HTML to include user-pasted content (probably yes, for safety)

Hard constraints:

- **No backend.** Final build must work as static files served from GitHub Pages.
- **No tracking, no analytics, no telemetry.** This is a privacy-respecting tool.
- **All user data lives in the user's browser only.** IndexedDB for persistence; never call out to anywhere except, optionally, fetching the official Spec Kit templates from the GitHub raw URLs at build time (not runtime).
- **Bundle size budget: under 500 KB gzipped** for the initial load. CodeMirror is the biggest dependency — that's fine.

---

## 4. Repo Layout

```
spec-kit-playground/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                    # entry, mounts <App />
│   ├── app.tsx                     # root component, layout shell
│   ├── styles/
│   │   ├── reset.css
│   │   ├── tokens.css              # CSS custom properties (colors, spacing, fonts)
│   │   ├── app.css                 # layout + component styles
│   │   └── editor.css              # CodeMirror theme overrides
│   ├── core/
│   │   ├── types.ts                # Workspace, Document, Feature, etc.
│   │   ├── state.ts                # signals-based store
│   │   ├── storage.ts              # IndexedDB persistence
│   │   ├── export.ts               # zip-builder logic
│   │   └── templates.ts            # built-in template strings
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DocumentTree.tsx
│   │   ├── Editor.tsx              # CodeMirror wrapper
│   │   ├── Preview.tsx             # markdown-it renderer
│   │   ├── Toolbar.tsx
│   │   ├── ExportModal.tsx
│   │   ├── NewFeatureModal.tsx
│   │   ├── EmptyState.tsx
│   │   └── ThemeToggle.tsx
│   ├── templates/                  # bundled .md template strings (or fetched at build)
│   │   ├── constitution.md
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── utils/
│       ├── debounce.ts
│       ├── slug.ts                 # "User Authentication" -> "001-user-authentication"
│       └── markdown.ts             # custom md-it config + sanitization
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                  # set base: '/spec-kit-playground/' for GH Pages
├── .github/
│   └── workflows/
│       └── deploy.yml              # build + deploy to gh-pages branch on push to main
├── README.md
└── LICENSE                         # MIT
```

---

## 5. Domain Model

This mirrors Spec Kit's actual on-disk layout. Verify against the real repo (`github/spec-kit`) before finalizing — the reference structure is:

```
.specify/
├── memory/
│   └── constitution.md
├── specs/
│   └── 001-feature-name/
│       ├── spec.md
│       ├── plan.md         # created at /plan stage
│       └── tasks/
│           └── tasks.md    # may be a single file or a folder of tasks
└── templates/
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

> Note: The exact tasks folder structure (single `tasks.md` vs many task files) varies by Spec Kit version. **Pick one convention, document it in the README, and stick to it.** Recommended: single `tasks.md` per feature for simplicity.

TypeScript shape:

```ts
interface Workspace {
  id: string;                       // uuid
  name: string;                     // "My Project"
  createdAt: number;
  updatedAt: number;
  constitution: Document;           // the single constitution.md
  features: Feature[];              // ordered list
  activeFeatureId: string | null;   // currently selected feature
  activeDocId: 'constitution' | { featureId: string; doc: 'spec' | 'plan' | 'tasks' };
}

interface Feature {
  id: string;                       // uuid
  number: number;                   // 1, 2, 3... (display as 001, 002...)
  slug: string;                     // "user-authentication"
  title: string;                    // "User Authentication"
  spec: Document;
  plan: Document;
  tasks: Document;
  createdAt: number;
}

interface Document {
  content: string;                  // raw markdown
  updatedAt: number;
}
```

Rules the model enforces:

- One workspace at a time in v1 (multi-workspace is stretch).
- Features are numbered in creation order; numbers do not get recycled when a feature is deleted.
- A feature's filesystem path is always `specs/{NNN}-{slug}/`.
- `slug` is derived from `title` via the `slug.ts` utility (lowercase, hyphenated, ASCII only, max 40 chars).

---

## 6. UI Layout

Three-pane desktop layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Header: logo · workspace name · [Export] [Theme] [Help]     │
├──────────┬───────────────────────────┬───────────────────────┤
│ Sidebar  │  Editor                    │  Preview             │
│          │                            │                      │
│ ▾ Memory │  # Constitution            │  Constitution        │
│   const. │  ## Core Principles        │  ============        │
│ ▾ Specs  │  ...                       │  Core Principles     │
│   001    │                            │  ...                 │
│   002    │                            │                      │
│ + Add    │                            │                      │
│ feature  │                            │                      │
└──────────┴───────────────────────────┴───────────────────────┘
```

- Sidebar is collapsible (toggle button in header). Saves preference to localStorage.
- Editor / Preview split is resizable with a drag handle. Defaults to 50/50.
- Preview can be hidden entirely (toolbar toggle) for a focus-mode feel.
- Mobile (< 768px): single pane, with a tab bar at the bottom switching between Tree / Edit / Preview.

---

## 7. Phased Build

Each phase is a checkpoint. **Stop at the end of each phase, run the app, and confirm the acceptance criteria are met before moving on.** If something feels off, raise it before continuing.

### Phase 1 — Skeleton + single-doc editor

Goal: A working Vite app with the three-pane layout and a single in-memory markdown document that edits and previews live.

Tasks:

- Vite + Preact + TypeScript project bootstrapped
- Strict TS config, ESLint, Prettier wired up
- Three-pane layout with hand-rolled CSS (Grid for the main shell, Flexbox for inner)
- CodeMirror 6 mounted in the middle pane with markdown language support and a clean dark+light theme
- markdown-it preview in the right pane, updates live as you type (debounced to 100ms)
- A single hardcoded "Welcome.md" document with placeholder content

**Acceptance:**

- Run `npm run dev`, see the layout
- Type in the editor → preview updates within ~100ms
- Build with `npm run build` and `npm run preview` works
- No console errors; bundle under 500 KB gzipped

### Phase 2 — Document model + templates + multi-doc nav

Goal: The full Spec Kit document model with template-seeded content and sidebar navigation.

Tasks:

- Implement the types in `core/types.ts`
- Build the signals-based store in `core/state.ts` (workspace, current doc, dirty state)
- Implement `core/templates.ts` — fetch the actual current Spec Kit template content from the official repo at *build time* (not runtime; embed as strings) so the playground produces output identical to a real `specify init`. Falls back to bundled strings if fetch fails.
- Sidebar tree shows: Memory → constitution; Specs → list of features; "+ Add feature" button at bottom
- Selecting a node in the sidebar swaps the editor + preview to that doc
- "+ Add feature" opens the `NewFeatureModal`: prompts for a title, derives the slug, picks the next number, seeds spec/plan/tasks from templates
- Renaming and deleting features (right-click context menu or hover affordance — your call)
- Active document is highlighted in the sidebar

**Acceptance:**

- Can create a workspace, add multiple features, switch between docs, edit each independently
- Each new feature comes pre-populated with the official template content
- Deleting a feature works and doesn't break numbering of remaining features
- All keyboard navigation works (Tab moves through interactive elements; Enter activates)

### Phase 3 — Persistence

Goal: Everything survives a refresh. The user never loses work.

Tasks:

- IndexedDB layer in `core/storage.ts` using `idb-keyval` (one key per workspace, value is the full serialized state)
- Auto-save on every change, debounced to 500ms
- On app load: hydrate from IndexedDB; if no saved state, show an `EmptyState` with a "Create your first workspace" CTA
- Visible "Saved" / "Saving…" indicator in the header — small, unobtrusive
- A "Reset" option in a hidden-by-default settings menu that wipes IndexedDB (with confirm)

**Acceptance:**

- Edit something, refresh the browser, edits are still there
- "Saving…" indicator shows briefly during save, "Saved" with timestamp at rest
- Reset clears everything cleanly

### Phase 4 — Export

Goal: User can download a real `.specify/` folder structure as a zip.

Tasks:

- Implement `core/export.ts` using JSZip
- Output structure must match Spec Kit conventions exactly:
  ```
  {workspace-name}.zip
  └── .specify/
      ├── memory/
      │   └── constitution.md
      ├── specs/
      │   ├── 001-feature-one/
      │   │   ├── spec.md
      │   │   ├── plan.md
      │   │   └── tasks.md
      │   └── 002-feature-two/
      │       └── ...
      └── templates/
          ├── spec-template.md
          ├── plan-template.md
          └── tasks-template.md
  ```
- Include a top-level `README.md` in the zip with a short note explaining how to drop it into a real project
- Export modal lets the user:
  - Toggle whether to include the `templates/` folder
  - Toggle whether to include features that are entirely empty (default: skip them)
  - Preview the file tree before downloading
- Single-document export: a "copy to clipboard" button next to each doc's title bar
- Single-document export: a "download .md" button as well

**Acceptance:**

- Exported zip unzips to the documented structure
- All files have correct content and no `\r\n` issues on any platform (use `\n` consistently)
- Clipboard copy works in Chrome, Firefox, Safari
- Download works without the File System Access API (use the blob + anchor trick for compatibility)

### Phase 5 — Polish

Goal: Feels like a real product, not a demo.

Tasks:

- **Theming**: light + dark mode via CSS custom properties; system-preference default with manual override saved to localStorage
- **Empty states**: thoughtful illustrations or copy when there's nothing to show
- **Keyboard shortcuts**: ⌘S (save indicator flash, since save is auto), ⌘E (export), ⌘B (toggle sidebar), ⌘P (toggle preview), ⌘N (new feature). Document them in a help modal (?)
- **Help modal**: brief explainer of SDD, links to GitHub Spec Kit, list of shortcuts, attribution
- **Accessibility pass**: keyboard nav everywhere, ARIA labels on icon-only buttons, focus-visible styles, sufficient contrast in both themes, `prefers-reduced-motion` respected
- **Responsive**: usable at 375px width via the mobile tab-bar layout
- **Loading state**: brief skeleton on first load while IndexedDB hydrates
- **Polished README**: hero screenshot, what + why + how, link to live demo, screenshots of each pane
- **Favicon and OG image**: simple but distinctive — leans into the "spec" / "blueprint" visual metaphor

**Acceptance:**

- Lighthouse score: ≥95 in Performance, Accessibility, Best Practices, SEO on the deployed site
- Looks intentional in both themes
- A non-developer can land on the page and figure out what to do without instructions

### Phase 6 — Stretch (do these only if Phases 1–5 are solid)

In rough priority order:

1. **Validation**: a "lint" panel that flags issues (constitution has fewer than 3 principles, spec has no user stories section, plan references libraries not mentioned in spec, etc.). Make rules pluggable.
2. **Multiple workspaces**: workspace switcher in the header; each is its own IndexedDB record
3. **URL sharing**: serialize workspace to a compressed-base64 URL fragment so users can share read-only snapshots (with a clear privacy warning that anything in the URL is visible to whoever has the link)
4. **Import**: drag-and-drop a `.specify` folder (or zip) onto the app to populate a workspace
5. **Diff view**: track a "saved baseline" and show what's changed since
6. **Slash command preview**: show the agent prompts a real `specify init` would create, so users can copy them to their agent of choice manually
7. **Print stylesheet**: nice print/PDF output of the full spec set

---

## 8. Deployment

GitHub Pages via Actions:

- Workflow at `.github/workflows/deploy.yml`
- Trigger: push to `main`
- Steps: checkout → setup Node 20 → `npm ci` → `npm run build` → upload `dist/` as artifact → deploy to `gh-pages` (use `actions/deploy-pages@v4`)
- `vite.config.ts` must set `base: '/spec-kit-playground/'` (or whatever the repo name ends up being) so asset paths resolve correctly

The `404.html` SPA fallback trick isn't needed since this is a single-page app with no routing — but if you decide to add routes later (e.g. `/help`, `/about`), do the standard `404.html → index.html` redirect.

---

## 9. Aesthetic & Tone

Lean technical, lean clean. The visual language should evoke "engineering blueprint" or "drafting table," not "SaaS dashboard." Some specifics:

- Monospace for code and document titles
- A muted, slightly-cool palette in light mode (off-white background, deep navy accents)
- A warm dark mode (not pure black — use a desaturated dark navy or charcoal)
- One accent color for primary actions; use it sparingly
- Iconography: prefer Lucide icons (small bundle, well-designed) or hand-drawn SVGs
- No gradients, no glassmorphism, no AI-aesthetic glow effects. Restraint.

Copy should be plainspoken and a little dry. "Export" not "✨ Generate Magic Bundle ✨". The product is for engineers; respect them.

---

## 10. Reference Material

The implementer should pull these up and verify behavior against them:

- Main repo: https://github.com/github/spec-kit
- Spec Kit docs site: https://github.github.com/spec-kit/
- Quickstart with the actual workflow: https://github.github.com/spec-kit/quickstart.html
- The `spec-driven.md` philosophy doc in the repo
- Live template files at `github/spec-kit/.../templates/` — fetch these at build time so the playground always seeds with the canonical text

When in doubt about *what* a Spec Kit artifact should look like, defer to the official repo's templates as the source of truth.

---

## 11. Definition of Done (v1)

- [ ] Deployed to GitHub Pages, public URL works
- [ ] All Phase 1–5 acceptance criteria met
- [ ] README has a screenshot and a working demo link
- [ ] Lighthouse ≥95 across all categories
- [ ] No console errors or warnings in production build
- [ ] Tested on latest Chrome, Firefox, Safari (desktop) and Chrome/Safari (mobile)
- [ ] MIT license file in place
- [ ] At least one stretch feature from Phase 6 shipped (implementer's choice)

---

## 12. Notes for the Implementer

- **Commit often, with meaningful messages.** One logical change per commit; group by phase.
- **Don't over-engineer.** This is a focused single-page app. Avoid premature abstraction — no plugin systems, no event buses, no DI containers. Signals + a few well-named modules is plenty.
- **Match the host's existing project style.** Look at their other repos before making style choices (indentation, brace style, file naming) and match where reasonable.
- **When you hit a decision the plan doesn't cover**, use your judgement and note it in the commit message or in a short `DECISIONS.md`. Don't block on minor calls.
- **Treat this like dogfooding.** It's a tool *for* spec-driven development, so the project's own README ought to read like something a careful spec-driven workflow would produce: clear, scoped, honest about trade-offs.
- If you want to actually use Spec Kit on this project (it would be very on-brand), feel free to add a real `.specify/` directory based on this plan as the input. Optional but kind of perfect.