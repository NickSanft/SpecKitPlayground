import { describe, expect, it } from 'vitest';
import { diffLines, hasChanges, summarizeDiff } from './diff';

describe('diffLines', () => {
  it('returns all-equal for identical inputs', () => {
    const out = diffLines('a\nb\nc', 'a\nb\nc');
    expect(out.every((l) => l.op === 'equal')).toBe(true);
    expect(out.map((l) => l.text)).toEqual(['a', 'b', 'c']);
  });

  it('marks added lines as added', () => {
    const out = diffLines('a\nb', 'a\nb\nc');
    expect(out.map((l) => l.op)).toEqual(['equal', 'equal', 'added']);
    expect(out[2]?.text).toBe('c');
  });

  it('marks removed lines as removed', () => {
    const out = diffLines('a\nb\nc', 'a\nc');
    expect(out.map((l) => l.op)).toEqual(['equal', 'removed', 'equal']);
    expect(out[1]?.text).toBe('b');
  });

  it('handles a complete replacement (no common lines)', () => {
    const out = diffLines('one\ntwo', 'three\nfour');
    expect(out.map((l) => l.op).filter((o) => o === 'removed')).toHaveLength(2);
    expect(out.map((l) => l.op).filter((o) => o === 'added')).toHaveLength(2);
  });

  it('handles empty baseline (all-added)', () => {
    const out = diffLines('', 'one\ntwo');
    expect(out.every((l) => l.op === 'added')).toBe(true);
    expect(out.length).toBe(2);
  });

  it('handles empty current (all-removed)', () => {
    const out = diffLines('one\ntwo', '');
    expect(out.every((l) => l.op === 'removed')).toBe(true);
    expect(out.length).toBe(2);
  });

  it('produces an empty diff for two empty strings', () => {
    expect(diffLines('', '')).toEqual([]);
  });

  it('preserves line numbers (1-based) for matched and changed lines', () => {
    const out = diffLines('a\nb', 'a\nB\nb');
    // a (equal), B (added), b (equal)
    expect(out[0]).toMatchObject({ op: 'equal', baselineLine: 1, currentLine: 1 });
    expect(out[1]).toMatchObject({ op: 'added', currentLine: 2 });
    expect(out[2]).toMatchObject({ op: 'equal', baselineLine: 2, currentLine: 3 });
  });

  it('does not crash on a long, completely-different input', () => {
    const a = Array.from({ length: 200 }, (_, i) => `a${i}`).join('\n');
    const b = Array.from({ length: 200 }, (_, i) => `b${i}`).join('\n');
    const out = diffLines(a, b);
    expect(out.length).toBe(400);
  });
});

describe('summarizeDiff', () => {
  it('counts each op kind', () => {
    const diff = diffLines('a\nb\nc', 'a\nB\nc\nd');
    const s = summarizeDiff(diff);
    expect(s.added).toBe(2); // B + d
    expect(s.removed).toBe(1); // b
    expect(s.unchanged).toBe(2); // a + c
  });

  it('returns all zeros for an empty diff', () => {
    expect(summarizeDiff([])).toEqual({ added: 0, removed: 0, unchanged: 0 });
  });
});

describe('hasChanges', () => {
  it('is false for identical strings', () => {
    expect(hasChanges('hello', 'hello')).toBe(false);
  });
  it('is true for any difference', () => {
    expect(hasChanges('hello', 'hello!')).toBe(true);
    expect(hasChanges('', 'x')).toBe(true);
    expect(hasChanges('x', '')).toBe(true);
  });
});
