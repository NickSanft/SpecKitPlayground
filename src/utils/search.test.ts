import { describe, expect, it } from 'vitest';
import {
  addFeature,
  createEmptyWorkspace,
  setActiveDoc,
  updateActiveDocContent,
} from '../core/state';
import { SEARCH_RESULT_CAP, searchWorkspace } from './search';

describe('searchWorkspace', () => {
  it('returns empty for empty query', () => {
    const ws = createEmptyWorkspace();
    expect(searchWorkspace(ws, '')).toEqual([]);
    expect(searchWorkspace(ws, '   ')).toEqual([]);
  });

  it('finds a single match in the constitution', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Project constitution\n\nWe value clarity above all else.\n');
    const results = searchWorkspace(ws, 'clarity');
    expect(results).toHaveLength(1);
    expect(results[0]?.targetLabel).toBe('constitution.md');
    expect(results[0]?.snippet.match).toBe('clarity');
    expect(results[0]?.line).toBe(3);
  });

  it('matches case-insensitively but preserves source casing in snippet.match', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Constitution\n\nWE Value Clarity Above All\n');
    const results = searchWorkspace(ws, 'value');
    expect(results).toHaveLength(1);
    expect(results[0]?.snippet.match).toBe('Value');
  });

  it('finds matches across multiple feature docs', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Auth');
    const featureId = ws.features[0]!.id;
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'spec' });
    ws = updateActiveDocContent(ws, '# Spec\n\nUser logs in here\n');
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'plan' });
    ws = updateActiveDocContent(ws, '# Plan\n\nUser session lifecycle\n');

    const results = searchWorkspace(ws, 'user');
    // Two matches in our edited docs (we only edited spec + plan; constitution
    // template might have its own matches but our edits guarantee >= 2).
    expect(results.length).toBeGreaterThanOrEqual(2);
    const labels = new Set(results.map((r) => r.targetLabel));
    expect(labels.has('spec.md — Auth')).toBe(true);
    expect(labels.has('plan.md — Auth')).toBe(true);
  });

  it('emits one result per match, even with multiple matches on a line', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Test\n\nfoo and foo and foo again\n');
    const results = searchWorkspace(ws, 'foo');
    expect(results).toHaveLength(3);
  });

  it('returns empty for queries with no matches', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Constitution\n\nClean and tidy.\n');
    expect(searchWorkspace(ws, 'wombat')).toEqual([]);
  });

  it('caps results to keep degenerate queries from flooding', () => {
    let ws = createEmptyWorkspace();
    const noisy = Array.from({ length: 250 }, () => 'x').join('\n');
    ws = updateActiveDocContent(ws, noisy);
    const results = searchWorkspace(ws, 'x');
    expect(results.length).toBeLessThanOrEqual(SEARCH_RESULT_CAP);
  });

  it('snippet shows ellipses on long lines', () => {
    const long = 'a'.repeat(200) + 'NEEDLE' + 'b'.repeat(200);
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, long);
    const r = searchWorkspace(ws, 'NEEDLE')[0]!;
    expect(r.snippet.before.startsWith('…')).toBe(true);
    expect(r.snippet.after.endsWith('…')).toBe(true);
    expect(r.snippet.match).toBe('NEEDLE');
  });

  it('returns 1-based line numbers', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, 'first line\nsecond line\nNEEDLE on third');
    const r = searchWorkspace(ws, 'NEEDLE')[0]!;
    expect(r.line).toBe(3);
  });
});
