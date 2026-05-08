import { del, get, set } from 'idb-keyval';
import type { Document, Feature, Workspace } from './types';

export const STORAGE_KEY = 'spk:workspace:v1';

interface SerializedDocument {
  content: string;
  updatedAt: number;
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

export function serializeWorkspace(ws: Workspace): SerializedWorkspace {
  return {
    schemaVersion: 1,
    id: ws.id,
    name: ws.name,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    constitution: { content: ws.constitution.content, updatedAt: ws.constitution.updatedAt },
    features: ws.features.map((f) => ({
      id: f.id,
      number: f.number,
      slug: f.slug,
      title: f.title,
      spec: { content: f.spec.content, updatedAt: f.spec.updatedAt },
      plan: { content: f.plan.content, updatedAt: f.plan.updatedAt },
      tasks: { content: f.tasks.content, updatedAt: f.tasks.updatedAt },
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
  if (!isObject(raw)) return { content: '', updatedAt: now };
  return {
    content: asString(raw['content'], ''),
    updatedAt: asNumber(raw['updatedAt'], now),
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

export async function loadWorkspace(): Promise<Workspace | null> {
  try {
    const raw = await get(STORAGE_KEY);
    if (raw === undefined) return null;
    return deserializeWorkspace(raw);
  } catch (err) {
    console.warn('loadWorkspace failed', err);
    return null;
  }
}

export async function saveWorkspace(ws: Workspace): Promise<void> {
  await set(STORAGE_KEY, serializeWorkspace(ws));
}

export async function clearWorkspace(): Promise<void> {
  await del(STORAGE_KEY);
}
