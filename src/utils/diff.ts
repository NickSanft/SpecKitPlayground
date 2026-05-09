export type DiffOp = 'equal' | 'added' | 'removed';

export interface DiffLine {
  op: DiffOp;
  /** Original line text (no trailing newline). */
  text: string;
  /** 1-based line number in the baseline (only when op is 'equal' or 'removed'). */
  baselineLine?: number;
  /** 1-based line number in the current content (only when op is 'equal' or 'added'). */
  currentLine?: number;
}

/**
 * Line-level diff via plain Longest Common Subsequence. O(m*n) time and
 * memory; fine for typical document sizes (<a few thousand lines).
 *
 * Returns the unified sequence of operations needed to turn `baseline`
 * into `current`, which is what a reader naturally expects from a diff
 * ("what changed since baseline").
 */
export function diffLines(baseline: string, current: string): DiffLine[] {
  const a = baseline === '' ? [] : baseline.split('\n');
  const b = current === '' ? [] : current.split('\n');
  const m = a.length;
  const n = b.length;

  // lcs[i][j] = LCS length of a[i..] vs b[j..]
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        lcs[i]![j] = (lcs[i + 1]![j + 1] ?? 0) + 1;
      } else {
        lcs[i]![j] = Math.max(lcs[i + 1]![j] ?? 0, lcs[i]![j + 1] ?? 0);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ op: 'equal', text: a[i]!, baselineLine: i + 1, currentLine: j + 1 });
      i += 1;
      j += 1;
    } else if ((lcs[i + 1]![j] ?? 0) >= (lcs[i]![j + 1] ?? 0)) {
      out.push({ op: 'removed', text: a[i]!, baselineLine: i + 1 });
      i += 1;
    } else {
      out.push({ op: 'added', text: b[j]!, currentLine: j + 1 });
      j += 1;
    }
  }
  while (i < m) {
    out.push({ op: 'removed', text: a[i]!, baselineLine: i + 1 });
    i += 1;
  }
  while (j < n) {
    out.push({ op: 'added', text: b[j]!, currentLine: j + 1 });
    j += 1;
  }
  return out;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

export function summarizeDiff(diff: readonly DiffLine[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const line of diff) {
    if (line.op === 'added') added += 1;
    else if (line.op === 'removed') removed += 1;
    else unchanged += 1;
  }
  return { added, removed, unchanged };
}

export function hasChanges(baseline: string, current: string): boolean {
  return baseline !== current;
}
