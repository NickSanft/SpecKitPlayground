import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clear, get, set } from 'idb-keyval';
import { addFeature, createEmptyWorkspace, setLintRuleEnabled } from './state';
import {
  INDEX_KEY,
  LEGACY_STORAGE_KEY,
  deserializeIndex,
  deserializeWorkspace,
  listWorkspaceMetas,
  loadIndex,
  loadWorkspaceById,
  migrateLegacyIfNeeded,
  recordKey,
  reconcileOrphanRecords,
  saveIndex,
  saveWorkspace,
  serializeWorkspace,
} from './storage';

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

  it('round-trips lintConfig.disabled when non-empty', () => {
    let ws = createEmptyWorkspace();
    ws = setLintRuleEnabled(ws, 'placeholders-remain', false);
    ws = setLintRuleEnabled(ws, 'tasks-has-checkboxes', false);
    const back = deserializeWorkspace(serializeWorkspace(ws));
    expect(back?.lintConfig?.disabled).toEqual(['placeholders-remain', 'tasks-has-checkboxes']);
  });

  it('omits lintConfig from the wire format when no rules are disabled', () => {
    const ws = createEmptyWorkspace();
    const serialized = serializeWorkspace(ws) as { lintConfig?: unknown };
    expect(serialized.lintConfig).toBeUndefined();
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

describe('deserializeIndex', () => {
  it('returns null for non-objects', () => {
    expect(deserializeIndex(null)).toBeNull();
    expect(deserializeIndex(undefined)).toBeNull();
    expect(deserializeIndex([])).toBeNull();
    expect(deserializeIndex('hi')).toBeNull();
  });

  it('returns null when ids is missing or empty', () => {
    expect(deserializeIndex({ active: 'a' })).toBeNull();
    expect(deserializeIndex({ active: 'a', ids: [] })).toBeNull();
  });

  it('drops non-string entries from ids', () => {
    const out = deserializeIndex({ active: 'a', ids: ['a', 42, '', 'b', null] });
    expect(out?.ids).toEqual(['a', 'b']);
    expect(out?.active).toBe('a');
  });

  it('falls back to the first id when active is unknown', () => {
    const out = deserializeIndex({ active: 'gone', ids: ['a', 'b'] });
    expect(out?.active).toBe('a');
  });
});

describe('IDB-backed storage (with idb-keyval, jsdom)', () => {
  beforeEach(async () => {
    await clear();
  });
  afterEach(async () => {
    await clear();
  });

  it('migrates a legacy v1 record to the v2 layout exactly once', async () => {
    const legacy = createEmptyWorkspace('From v1');
    await set(LEGACY_STORAGE_KEY, serializeWorkspace(legacy));

    await migrateLegacyIfNeeded();

    // Index is set to the legacy workspace id, record is keyed by recordKey.
    const idx = await loadIndex();
    expect(idx?.ids).toEqual([legacy.id]);
    expect(idx?.active).toBe(legacy.id);
    const restored = await loadWorkspaceById(legacy.id);
    expect(restored?.name).toBe('From v1');
    // Legacy key is gone.
    expect(await get(LEGACY_STORAGE_KEY)).toBeUndefined();

    // A second migration is a no-op.
    await migrateLegacyIfNeeded();
    expect((await loadIndex())?.ids).toEqual([legacy.id]);
  });

  it('drops an unrecoverable legacy record on migration', async () => {
    await set(LEGACY_STORAGE_KEY, { not: 'a workspace' });
    await migrateLegacyIfNeeded();
    expect(await loadIndex()).toBeNull();
    expect(await get(LEGACY_STORAGE_KEY)).toBeUndefined();
  });

  it('saveWorkspace writes under the recordKey for that id', async () => {
    const ws = createEmptyWorkspace('Save Test');
    await saveWorkspace(ws);
    const directlyRead = await get(recordKey(ws.id));
    expect(directlyRead).toBeDefined();
    const restored = await loadWorkspaceById(ws.id);
    expect(restored?.name).toBe('Save Test');
  });

  it('listWorkspaceMetas returns metadata for every id in the index, in order', async () => {
    const a = createEmptyWorkspace('Alpha');
    const b = createEmptyWorkspace('Beta');
    await saveWorkspace(a);
    await saveWorkspace(b);
    await saveIndex({ active: a.id, ids: [a.id, b.id] });

    const metas = await listWorkspaceMetas();
    expect(metas.map((m) => m.name)).toEqual(['Alpha', 'Beta']);
  });

  it('reconcileOrphanRecords does not delete the index even though INDEX_KEY shares the record prefix', async () => {
    const a = createEmptyWorkspace('Real');
    await saveWorkspace(a);
    await saveIndex({ active: a.id, ids: [a.id] });

    await reconcileOrphanRecords();

    expect(await loadIndex()).not.toBeNull();
    expect(await loadWorkspaceById(a.id)).not.toBeNull();
  });

  it('reconcileOrphanRecords removes records not referenced in the index', async () => {
    const a = createEmptyWorkspace('Kept');
    const orphan = createEmptyWorkspace('Orphan');
    await saveWorkspace(a);
    await saveWorkspace(orphan);
    await saveIndex({ active: a.id, ids: [a.id] });

    await reconcileOrphanRecords();

    expect(await get(recordKey(a.id))).toBeDefined();
    expect(await get(recordKey(orphan.id))).toBeUndefined();
  });

  it('listWorkspaceMetas skips ids whose record is missing', async () => {
    const a = createEmptyWorkspace('Real');
    await saveWorkspace(a);
    await saveIndex({ active: a.id, ids: [a.id, 'missing-id'] });
    const metas = await listWorkspaceMetas();
    expect(metas.length).toBe(1);
    expect(metas[0]?.id).toBe(a.id);
  });

  it('returns an empty list when no index exists', async () => {
    expect(await listWorkspaceMetas()).toEqual([]);
  });

  it('returns null from loadWorkspaceById for unknown ids', async () => {
    expect(await loadWorkspaceById('nope')).toBeNull();
  });

  it('reads and writes the index round-trip', async () => {
    await saveIndex({ active: 'x', ids: ['x', 'y'] });
    const back = await loadIndex();
    expect(back).toEqual({ active: 'x', ids: ['x', 'y'] });
  });

  it('treats a corrupted index as no index', async () => {
    await set(INDEX_KEY, { not: 'an index' });
    expect(await loadIndex()).toBeNull();
  });
});
