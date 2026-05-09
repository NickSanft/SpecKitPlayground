import { useMemo } from 'preact/hooks';
import { activeDocBaseline, activeDocContent } from '../core/state';
import { diffLines, summarizeDiff } from '../utils/diff';

export function DiffView() {
  const baseline = activeDocBaseline.value;
  const current = activeDocContent.value;

  const diff = useMemo(() => diffLines(baseline, current), [baseline, current]);
  const summary = useMemo(() => summarizeDiff(diff), [diff]);

  if (baseline === current) {
    return (
      <div class="diff-empty" role="status">
        <p class="diff-empty-title">No changes against baseline.</p>
        <p class="diff-empty-hint">
          Edit the document or change which doc is active to see a diff. The baseline updates when
          you mark it explicitly or export the workspace.
        </p>
      </div>
    );
  }

  return (
    <section class="diff-view" aria-label="Diff against baseline">
      <header class="diff-header">
        <span class="diff-summary">
          <span class="diff-summary-added">+{summary.added}</span>{' '}
          <span class="diff-summary-removed">−{summary.removed}</span>{' '}
          <span class="diff-summary-equal">={summary.unchanged}</span>
        </span>
      </header>
      <ol class="diff-lines" role="list">
        {diff.map((line, idx) => (
          <li
            class={`diff-line diff-line-${line.op}`}
            data-baseline-line={line.baselineLine ?? ''}
            data-current-line={line.currentLine ?? ''}
            key={`${idx}:${line.op}:${line.baselineLine ?? ''}:${line.currentLine ?? ''}`}
          >
            <span class="diff-gutter" aria-hidden="true">
              {line.op === 'added' ? '+' : line.op === 'removed' ? '−' : ' '}
            </span>
            <span class="diff-text">{line.text === '' ? ' ' : line.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
