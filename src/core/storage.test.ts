import { describe, expect, it } from 'vitest';
import { addFeature, createEmptyWorkspace } from './state';
import { deserializeWorkspace, serializeWorkspace } from './storage';

describe('serializeWorkspace + deserializeWorkspace', () => {
  it('round-trips an empty workspace', () => {
    const ws = createEmptyWorkspace('Round Trip');
    const back = deserializeWorkspace(serializeWorkspace(ws));
    expect(back).toEqual(ws);
  });

  it('round-trips a workspace with features', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'one');
    ws = addFeature(ws, 'two');
    const back = deserializeWorkspace(serializeWorkspace(ws));
    expect(back).toEqual(ws);
  });

  it('survives going through JSON.stringify (structured-clone-equivalent path)', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'json round trip');
    const json = JSON.parse(JSON.stringify(serializeWorkspace(ws))) as unknown;
    const back = deserializeWorkspace(json);
    expect(back).toEqual(ws);
  });
});

describe('deserializeWorkspace defensive behaviour', () => {
  it('returns null for non-objects', () => {
    expect(deserializeWorkspace(null)).toBeNull();
    expect(deserializeWorkspace(undefined)).toBeNull();
    expect(deserializeWorkspace(42)).toBeNull();
    expect(deserializeWorkspace('not a workspace')).toBeNull();
    expect(deserializeWorkspace([])).toBeNull();
  });

  it('returns null when the workspace id is missing', () => {
    expect(deserializeWorkspace({ name: 'no id' })).toBeNull();
  });

  it('fills missing optional fields with sensible defaults', () => {
    const minimal = { id: 'ws-1' };
    const out = deserializeWorkspace(minimal);
    expect(out).not.toBeNull();
    expect(out?.name).toBe('My Project');
    expect(out?.features).toEqual([]);
    expect(out?.activeDocId).toEqual({ kind: 'constitution' });
    expect(out?.constitution.content).toBe('');
  });

  it('drops malformed features but keeps valid ones', () => {
    const out = deserializeWorkspace({
      id: 'ws-1',
      features: [
        { id: 'f-good', number: 1, slug: 'good', title: 'Good' },
        { number: 2, slug: 'no-id' },
        null,
        'wrong type',
        { id: 'f-zero', number: 0, slug: 'zero', title: 'Zero' },
      ],
    });
    expect(out?.features.length).toBe(1);
    expect(out?.features[0]?.id).toBe('f-good');
  });

  it('falls back to constitution when activeDocId references a deleted feature', () => {
    const out = deserializeWorkspace({
      id: 'ws-1',
      features: [],
      activeDocId: { kind: 'feature', featureId: 'gone', doc: 'spec' },
    });
    expect(out?.activeDocId).toEqual({ kind: 'constitution' });
  });

  it('falls back to constitution when activeDocId.doc is invalid', () => {
    const out = deserializeWorkspace({
      id: 'ws-1',
      features: [{ id: 'f-1', number: 1, slug: 'x', title: 'X' }],
      activeDocId: { kind: 'feature', featureId: 'f-1', doc: 'bogus' },
    });
    expect(out?.activeDocId).toEqual({ kind: 'constitution' });
  });

  it('preserves a valid activeDocId pointing at an existing feature', () => {
    const out = deserializeWorkspace({
      id: 'ws-1',
      features: [{ id: 'f-1', number: 1, slug: 'x', title: 'X' }],
      activeDocId: { kind: 'feature', featureId: 'f-1', doc: 'plan' },
    });
    expect(out?.activeDocId).toEqual({ kind: 'feature', featureId: 'f-1', doc: 'plan' });
  });

  it('coerces invalid timestamp fields to a fallback', () => {
    const out = deserializeWorkspace({
      id: 'ws-1',
      createdAt: 'not a number',
      updatedAt: NaN,
    });
    expect(typeof out?.createdAt).toBe('number');
    expect(typeof out?.updatedAt).toBe('number');
    expect(Number.isFinite(out?.createdAt ?? NaN)).toBe(true);
    expect(Number.isFinite(out?.updatedAt ?? NaN)).toBe(true);
  });
});
