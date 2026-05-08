import { getDiagnosticsSignal } from './LintPanel';

const diagnostics = getDiagnosticsSignal();

export function LintButton({ onOpen }: { onOpen: () => void }) {
  const list = diagnostics.value;
  const count = list.length;
  const worst = list.some((d) => d.severity === 'error')
    ? 'error'
    : list.some((d) => d.severity === 'warning')
      ? 'warning'
      : list.some((d) => d.severity === 'info')
        ? 'info'
        : null;

  return (
    <button
      type="button"
      class="btn btn-secondary header-lint"
      onClick={onOpen}
      aria-label={`Open lint panel — ${count} issue${count === 1 ? '' : 's'}`}
    >
      Lint
      {count > 0 && worst && (
        <span class={`lint-pip lint-pip-${worst}`} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
