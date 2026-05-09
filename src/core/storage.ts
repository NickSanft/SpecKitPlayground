import { del, get, keys, set } from 'idb-keyval';
import type { Document, Feature, Workspace } from './types';

// Legacy v1 single-workspace key — kept for migration only.
export const LEGACY_STORAGE_KEY = 'spk:workspace:v1';

// v2 layout: one record per workspace + a small index.
export const INDEX_KEY = 'spk:workspaces:v2:index';
const RECORD_PREFIX = 'spk:workspaces:v2:';

export function recordKey(id: string): string {
  return `${RECORD_PREFIX}${id}`;
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface WorkspaceIndex {
  active: string;
  ids: readonly string[];
}

interface SerializedDocument {
  content: string;
  updatedAt: number;
  baseline?: string;
}

interface SerializedFeature {
  id: string;
  number: number;
  slug: string;
  title: string;
  spec: SerializedDocument;
  plan: SerializedDocument;
  tasks: SerializedDocument;
  createdAt: number;
}

interface SerializedWorkspace {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  constitution: SerializedDocument;
  features: SerializedFeature[];
  activeDocId: Workspace['activeDocId'];
}

interface SerializedIndex {
  schemaVersion: 2;
  active: string;
  ids: string[];
}

function serializeDocument(doc: Document): SerializedDocument {
  const out: SerializedDocument = { content: doc.content, updatedAt: doc.updatedAt };
  if (doc.baseline !== undefined && doc.baseline !== doc.content) {
    out.baseline = doc.baseline;
  }
  return out;
}

export function serializeWorkspace(ws: Workspace): SerializedWorkspace {
  return {
    schemaVersion: 1,
    id: ws.id,
    name: ws.name,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    constitution: serializeDocument(ws.constitution),
    features: ws.features.map((f) => ({
      id: f.id,
      number: f.number,
      slug: f.slug,
      title: f.title,
      spec: serializeDocument(f.spec),
      plan: serializeDocument(f.plan),
      tasks: serializeDocument(f.tasks),
      createdAt: f.createdAt,
    })),
    activeDocId: ws.activeDocId,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function deserializeDocument(raw: unknown, now: number): Document {
  if (!isObject(raw)) return { content: '', updatedAt: now, baseline: '' };
  const content = asString(raw['content'], '');
  const baselineRaw = raw['baseline'];
  // Older records (pre-Phase-10) don't carry a baseline — default to current
  // content so the diff view shows nothing until the user makes an edit.
  const baseline = typeof baselineRaw === 'string' ? baselineRaw : content;
  return {
    content,
    updatedAt: asNumber(raw['updatedAt'], now),
    baseline,
  };
}

function deserializeFeature(raw: unknown, now: number): Feature | null {
  if (!isObject(raw)) return null;
  const id = asString(raw['id'], '');
  const number = asNumber(raw['number'], 0);
  if (!id || number <= 0) return null;
  return {
    id,
    number,
    slug: asString(raw['slug'], 'feature'),
    title: asString(raw['title'], 'Untitled'),
    spec: deserializeDocument(raw['spec'], now),
    plan: deserializeDocument(raw['plan'], now),
    tasks: deserializeDocument(raw['tasks'], now),
    createdAt: asNumber(raw['createdAt'], now),
  };
}

function deserializeActiveDocId(
  raw: unknown,
  features: readonly Feature[],
): Workspace['activeDocId'] {
  if (isObject(raw)) {
    if (raw['kind'] === 'constitution') return { kind: 'constitution' };
    if (raw['kind'] === 'feature') {
      const featureId = asString(raw['featureId'], '');
      const doc = raw['doc'];
      const validDoc = doc === 'spec' || doc === 'plan' || doc === 'tasks';
      const exists = features.some((f) => f.id === featureId);
      if (validDoc && exists) {
        return { kind: 'feature', featureId, doc };
      }
    }
  }
  return { kind: 'constitution' };
}

export function deserializeWorkspace(raw: unknown): Workspace | null {
  if (!isObject(raw)) return null;
  const id = asString(raw['id'], '');
  if (!id) return null;

  const now = Date.now();
  const featuresRaw = Array.isArray(raw['features']) ? raw['features'] : [];
  const features = featuresRaw
    .map((f) => deserializeFeature(f, now))
    .filter((f): f is Feature => f !== null);

  return {
    id,
    name: asString(raw['name'], 'My Project'),
    createdAt: asNumber(raw['createdAt'], now),
    updatedAt: asNumber(raw['updatedAt'], now),
    constitution: deserializeDocument(raw['constitution'], now),
    features,
    activeDocId: deserializeActiveDocId(raw['activeDocId'], features),
  };
}

export function deserializeIndex(raw: unknown): WorkspaceIndex | null {
  if (!isObject(raw)) return null;
  const idsRaw = raw['ids'];
  if (!Array.isArray(idsRaw)) return null;
  const ids = idsRaw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return null;
  const requestedActive = asString(raw['active'], '');
  const active = ids.includes(requestedActive) ? requestedActive : (ids[0] ?? '');
  if (!active) return null;
  return { active, ids };
}

function serializeIndex(idx: WorkspaceIndex): SerializedIndex {
  return { schemaVersion: 2, active: idx.active, ids: [...idx.ids] };
}

export async function loadIndex(): Promise<WorkspaceIndex | null> {
  try {
    const raw = await get(INDEX_KEY);
    if (raw === undefined) return null;
    return deserializeIndex(raw);
  } catch (err) {
    console.warn('loadIndex failed', err);
    return null;
  }
}

export async function saveIndex(idx: WorkspaceIndex): Promise<void> {
  await set(INDEX_KEY, serializeIndex(idx));
}

export async function loadWorkspaceById(id: string): Promise<Workspace | null> {
  try {
    const raw = await get(recordKey(id));
    if (raw === undefined) return null;
    return deserializeWorkspace(raw);
  } catch (err) {
    console.warn(`loadWorkspaceById(${id}) failed`, err);
    return null;
  }
}

export async function saveWorkspace(ws: Workspace): Promise<void> {
  await set(recordKey(ws.id), serializeWorkspace(ws));
}

export async function deleteWorkspaceRecord(id: string): Promise<void> {
  await del(recordKey(id));
}

export async function listWorkspaceMetas(): Promise<WorkspaceMeta[]> {
  const idx = await loadIndex();
  if (!idx) return [];
  const metas: WorkspaceMeta[] = [];
  for (const id of idx.ids) {
    const ws = await loadWorkspaceById(id);
    if (ws) metas.push({ id: ws.id, name: ws.name, updatedAt: ws.updatedAt });
  }
  return metas;
}

/**
 * Migrate the legacy single-workspace key to the v2 multi-workspace layout.
 * Idempotent — safe to call on every boot.
 */
export async function migrateLegacyIfNeeded(): Promise<void> {
  try {
    const existing = await get(INDEX_KEY);
    if (existing !== undefined) return; // already on v2
    const legacyRaw = await get(LEGACY_STORAGE_KEY);
    if (legacyRaw === undefined) return; // nothing to migrate
    const ws = deserializeWorkspace(legacyRaw);
    if (!ws) {
      // Unrecoverable v1 record — drop it so it doesn't keep failing migration.
      await del(LEGACY_STORAGE_KEY);
      return;
    }
    await saveWorkspace(ws);
    await saveIndex({ active: ws.id, ids: [ws.id] });
    await del(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn('migrateLegacyIfNeeded failed', err);
  }
}

/**
 * Best-effort cleanup. Drops record keys that aren't referenced by the index
 * (e.g. left over from a half-completed delete).
 */
export async function reconcileOrphanRecords(): Promise<void> {
  try {
    const idx = await loadIndex();
    const valid = new Set(idx ? idx.ids : []);
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key !== 'string') continue;
      if (key === INDEX_KEY) continue;
      if (!key.startsWith(RECORD_PREFIX)) continue;
      const id = key.slice(RECORD_PREFIX.length);
      if (!valid.has(id)) {
        await del(key);
      }
    }
  } catch (err) {
    console.warn('reconcileOrphanRecords failed', err);
  }
}

/**
 * Wipe everything — used by the "delete all workspaces" path. Returns void.
 */
export async function clearAllWorkspaces(): Promise<void> {
  const idx = await loadIndex();
  if (idx) {
    for (const id of idx.ids) {
      await deleteWorkspaceRecord(id);
    }
  }
  await del(INDEX_KEY);
  await del(LEGACY_STORAGE_KEY);
}
