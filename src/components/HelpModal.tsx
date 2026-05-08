import { formatShortcut, type ShortcutMatch } from '../core/shortcuts';

export interface HelpModalProps {
  onClose: () => void;
  shortcuts: ReadonlyArray<{ match: ShortcutMatch; description: string }>;
}

export function HelpModal({ onClose, shortcuts }: HelpModalProps) {
  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title" class="modal-title">
          About Spec Kit Playground
        </h2>

        <section class="help-section">
          <p>
            A browser-only editor for drafting{' '}
            <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer">
              GitHub Spec Kit
            </a>{' '}
            artifacts. Spec-Driven Development treats the spec as the durable artifact and code as
            the renderable output. This tool lets you draft <code>constitution.md</code>,{' '}
            <code>spec.md</code>, <code>plan.md</code>, and <code>tasks.md</code> without installing
            the CLI.
          </p>
          <p>
            Your work lives only in this browser (IndexedDB). When you're ready, hit{' '}
            <strong>Export</strong> to download a properly-structured <code>.specify/</code> folder
            as a zip and drop it into a real project.
          </p>
        </section>

        <section class="help-section">
          <h3 class="help-heading">Keyboard shortcuts</h3>
          <table class="help-shortcuts">
            <tbody>
              {shortcuts.map(({ match, description }) => (
                <tr>
                  <td>
                    <kbd>{formatShortcut(match)}</kbd>
                  </td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="help-footnote">
            Some browsers reserve <kbd>{formatShortcut({ key: 'n', cmdOrCtrl: true })}</kbd> for
            opening a new window — if it does, use the sidebar's "+ Add feature" button instead.
          </p>
        </section>

        <section class="help-section">
          <h3 class="help-heading">Conventions</h3>
          <ul class="help-list">
            <li>
              One <code>tasks.md</code> per feature — matches the current upstream Spec Kit template
              shape.
            </li>
            <li>
              Feature directories are <code>NNN-slug</code> and never recycle numbers (matches the
              git-branch convention).
            </li>
            <li>
              Templates are synced from the official repo at build time; export always uses the
              upstream content for the templates folder.
            </li>
          </ul>
        </section>

        <section class="help-section help-meta">
          <p>
            <a
              href="https://github.com/NickSanft/SpecKitPlayground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
            </a>{' '}
            ·{' '}
            <a
              href="https://github.com/NickSanft/SpecKitPlayground/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an issue
            </a>{' '}
            · MIT licensed.
          </p>
        </section>

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
