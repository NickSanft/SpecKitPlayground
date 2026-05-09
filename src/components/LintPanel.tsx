import { computed } from '@preact/signals';
import { useState } from 'preact/hooks';
import {
  type Diagnostic,
  type Severity,
  getRules,
  isRuleEnabled,
  lintWorkspace,
} from '../core/lint';
import { commitSetActiveDoc, commitSetLintRuleEnabled, workspaceSignal } from '../core/state';

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

type LintTab = 'diagnostics' | 'config';

export function LintPanel({ onClose }: LintPanelProps) {
  const [tab, setTab] = useState<LintTab>('diagnostics');
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

        <div class="lint-tabs" role="tablist" aria-label="Lint panel sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'diagnostics' ? 'true' : 'false'}
            class={`lint-tab ${tab === 'diagnostics' ? 'is-active' : ''}`}
            onClick={() => setTab('diagnostics')}
          >
            Diagnostics{list.length > 0 ? ` (${list.length})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'config' ? 'true' : 'false'}
            class={`lint-tab ${tab === 'config' ? 'is-active' : ''}`}
            onClick={() => setTab('config')}
          >
            Configure
          </button>
        </div>

        {tab === 'diagnostics' ? <DiagnosticsView list={list} onOpen={open} /> : <ConfigureView />}

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DiagnosticsView({
  list,
  onOpen,
}: {
  list: readonly Diagnostic[];
  onOpen: (d: Diagnostic) => void;
}) {
  if (list.length === 0) {
    return <p class="lint-empty">No issues found.</p>;
  }
  return (
    <>
      <p class="modal-hint">
        Heuristic checks against your workspace. Click an entry to jump to that document.
      </p>
      <ul class="lint-list" role="list">
        {list.map((d) => (
          <li class="lint-row">
            <button type="button" class="lint-row-button" onClick={() => onOpen(d)}>
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
    </>
  );
}

function ConfigureView() {
  const workspace = workspaceSignal.value;
  const rules = getRules();
  return (
    <>
      <p class="modal-hint">
        Toggle rules on or off for this workspace. Disabled rules don't run, don't show in
        diagnostics, and don't count towards the header pip.
      </p>
      <ul class="lint-config-list" role="list">
        {rules.map((rule) => {
          const enabled = isRuleEnabled(workspace, rule.id);
          return (
            <li class="lint-config-row">
              <label class="lint-config-label">
                <input
                  type="checkbox"
                  checked={enabled}
                  aria-label={`${enabled ? 'Disable' : 'Enable'} rule ${rule.id}`}
                  onChange={(e) =>
                    commitSetLintRuleEnabled(rule.id, (e.target as HTMLInputElement).checked)
                  }
                />
                <span>
                  <span class="lint-config-id">{rule.id}</span>
                  <span class="lint-config-desc">{rule.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}
