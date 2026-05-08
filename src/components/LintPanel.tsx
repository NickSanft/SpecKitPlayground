import { computed } from '@preact/signals';
import { type Diagnostic, type Severity, lintWorkspace } from '../core/lint';
import { commitSetActiveDoc, workspaceSignal } from '../core/state';

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'INFO',
  warning: 'WARN',
  error: 'ERR',
};

const diagnostics = computed(() => lintWorkspace(workspaceSignal.value));

export function getDiagnosticsCount(): number {
  return diagnostics.value.length;
}

export function getDiagnosticsSignal() {
  return diagnostics;
}

export interface LintPanelProps {
  onClose: () => void;
}

export function LintPanel({ onClose }: LintPanelProps) {
  const list = diagnostics.value;

  function open(d: Diagnostic) {
    commitSetActiveDoc(d.target);
    onClose();
  }

  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lint-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="lint-title" class="modal-title">
          Workspace lint
        </h2>
        <p class="modal-hint">
          Heuristic checks against your workspace. Click an entry to jump to that document.
        </p>

        {list.length === 0 ? (
          <p class="lint-empty">No issues found.</p>
        ) : (
          <ul class="lint-list" role="list">
            {list.map((d) => (
              <li class="lint-row">
                <button type="button" class="lint-row-button" onClick={() => open(d)}>
                  <span class={`lint-badge lint-badge-${d.severity}`}>
                    {SEVERITY_LABEL[d.severity]}
                  </span>
                  <span class="lint-row-body">
                    <span class="lint-row-message">{d.message}</span>
                    <span class="lint-row-target">{d.targetLabel}</span>
                  </span>
                  <span class="lint-row-rule" aria-hidden="true">
                    {d.ruleId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
