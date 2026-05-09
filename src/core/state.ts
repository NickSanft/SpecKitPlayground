import { computed, effect, signal } from '@preact/signals';
import { debounce } from '../utils/debounce';
import { slugify } from '../utils/slug';
import {
  type WorkspaceMeta,
  clearAllWorkspaces,
  deleteWorkspaceRecord,
  listWorkspaceMetas,
  loadIndex,
  loadWorkspaceById,
  migrateLegacyIfNeeded,
  reconcileOrphanRecords,
  saveIndex,
  saveWorkspace,
} from './storage';
import { getTemplate, templates } from './templates';
import {
  type ActiveDocId,
  type Document,
  type Feature,
  type FeatureDocKind,
  type Workspace,
  activeDocsAreEqual,
} from './types';

const FEATURE_DOC_KINDS: readonly FeatureDocKind[] = ['spec', 'plan', 'tasks'];

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
}

function now(): number {
  return Date.now();
}

function newDocument(content: string, at: number = now()): Document {
  return { content, updatedAt: at };
}

export function createEmptyWorkspace(name: string = 'My Project'): Workspace {
  const at = now();
  return {
    id: newId(),
    name,
    createdAt: at,
    updatedAt: at,
    constitution: newDocument(getTemplate('constitution'), at),
    features: [],
    activeDocId: { kind: 'constitution' },
  };
}

function nextFeatureNumber(features: readonly Feature[]): number {
  let maxN = 0;
  for (const f of features) {
    if (f.number > maxN) maxN = f.number;
  }
  return maxN + 1;
}

export function addFeature(workspace: Workspace, title: string): Workspace {
  const trimmed = title.trim();
  if (trimmed.length === 0) return workspace;
  const at = now();
  const feature: Feature = {
    id: newId(),
    number: nextFeatureNumber(workspace.features),
    slug: slugify(trimmed),
    title: trimmed,
    spec: newDocument(getTemplate('spec'), at),
    plan: newDocument(getTemplate('plan'), at),
    tasks: newDocument(getTemplate('tasks'), at),
    createdAt: at,
  };
  return {
    ...workspace,
    features: [...workspace.features, feature],
    activeDocId: { kind: 'feature', featureId: feature.id, doc: 'spec' },
    updatedAt: at,
  };
}

export function renameFeature(
  workspace: Workspace,
  featureId: string,
  newTitle: string,
): Workspace {
  const trimmed = newTitle.trim();
  if (trimmed.length === 0) return workspace;
  const at = now();
  const features = workspace.features.map((f) =>
    f.id === featureId ? { ...f, title: trimmed, slug: slugify(trimmed) } : f,
  );
  return { ...workspace, features, updatedAt: at };
}

export function deleteFeature(workspace: Workspace, featureId: string): Workspace {
  const features = workspace.features.filter((f) => f.id !== featureId);
  if (features.length === workspace.features.length) return workspace;

  let activeDocId = workspace.activeDocId;
  if (activeDocId.kind === 'feature' && activeDocId.featureId === featureId) {
    activeDocId = { kind: 'constitution' };
  }
  return {
    ...workspace,
    features,
    activeDocId,
    updatedAt: now(),
  };
}

export function setActiveDoc(workspace: Workspace, next: ActiveDocId): Workspace {
  if (next.kind === 'feature') {
    const exists = workspace.features.some((f) => f.id === next.featureId);
    if (!exists) return workspace;
  }
  if (activeDocsAreEqual(workspace.activeDocId, next)) return workspace;
  return { ...workspace, activeDocId: next };
}

export function updateActiveDocContent(workspace: Workspace, content: string): Workspace {
  const at = now();
  if (workspace.activeDocId.kind === 'constitution') {
    if (workspace.constitution.content === content) return workspace;
    return {
      ...workspace,
      constitution: { content, updatedAt: at },
      updatedAt: at,
    };
  }
  const target = workspace.activeDocId;
  const features = workspace.features.map((f) =>
    f.id === target.featureId ? { ...f, [target.doc]: { content, updatedAt: at } } : f,
  );
  return { ...workspace, features, updatedAt: at };
}

export function renameWorkspace(workspace: Workspace, newName: string): Workspace {
  const trimmed = newName.trim();
  if (trimmed.length === 0 || trimmed === workspace.name) return workspace;
  return { ...workspace, name: trimmed, updatedAt: now() };
}

export function getActiveDocContent(workspace: Workspace): string {
  if (workspace.activeDocId.kind === 'constitution') {
    return workspace.constitution.content;
  }
  const target = workspace.activeDocId;
  const feature = workspace.features.find((f) => f.id === target.featureId);
  if (!feature) return '';
  return feature[target.doc].content;
}

export function getActiveDocLabel(workspace: Workspace): string {
  if (workspace.activeDocId.kind === 'constitution') return 'constitution.md';
  const target = workspace.activeDocId;
  const feature = workspace.features.find((f) => f.id === target.featureId);
  if (!feature) return '';
  return `${target.doc}.md — ${feature.title}`;
}

export function isFeatureDocKind(value: string): value is FeatureDocKind {
  return (FEATURE_DOC_KINDS as readonly string[]).includes(value);
}

export const FEATURE_DOCS: readonly FeatureDocKind[] = FEATURE_DOC_KINDS;

// Signals layer — separate from the pure reducers above so tests can run
// without instantiating signals.

export const workspaceSignal = signal<Workspace>(createEmptyWorkspace());
export const workspaceList = signal<WorkspaceMeta[]>([]);
export const activeDocContent = computed(() => getActiveDocContent(workspaceSignal.value));
export const activeDocLabel = computed(() => getActiveDocLabel(workspaceSignal.value));

export const isPristineWorkspace = computed(() => {
  const ws = workspaceSignal.value;
  return ws.features.length === 0 && ws.constitution.content === templates.constitution;
});

export type SaveStatus = 'idle' | 'saving' | 'saved';
export const saveStatus = signal<SaveStatus>('idle');
export const lastSavedAt = signal<number | null>(null);

export function commitAddFeature(title: string): void {
  workspaceSignal.value = addFeature(workspaceSignal.value, title);
}
export function commitRenameFeature(featureId: string, newTitle: string): void {
  workspaceSignal.value = renameFeature(workspaceSignal.value, featureId, newTitle);
}
export function commitDeleteFeature(featureId: string): void {
  workspaceSignal.value = deleteFeature(workspaceSignal.value, featureId);
}
export function commitSetActiveDoc(next: ActiveDocId): void {
  workspaceSignal.value = setActiveDoc(workspaceSignal.value, next);
}
export function commitUpdateActiveDocContent(content: string): void {
  workspaceSignal.value = updateActiveDocContent(workspaceSignal.value, content);
}
export function commitRenameActiveWorkspace(newName: string): void {
  const next = renameWorkspace(workspaceSignal.value, newName);
  if (next === workspaceSignal.value) return;
  workspaceSignal.value = next;
  // List metas update on next refresh; do it eagerly so the switcher updates
  // without waiting for the auto-save round-trip.
  workspaceList.value = workspaceList.value.map((m) =>
    m.id === next.id ? { ...m, name: next.name, updatedAt: next.updatedAt } : m,
  );
}

let autoSaveStarted = false;
const flushSave = debounce((ws: Workspace) => {
  saveStatus.value = 'saving';
  saveWorkspace(ws)
    .then(() => {
      saveStatus.value = 'saved';
      lastSavedAt.value = Date.now();
    })
    .catch((err: unknown) => {
      console.warn('saveWorkspace failed', err);
      saveStatus.value = 'idle';
    });
}, 500);

function startAutoSave(): void {
  if (autoSaveStarted) return;
  autoSaveStarted = true;

  let isInitial = true;
  effect(() => {
    const ws = workspaceSignal.value;
    if (isInitial) {
      isInitial = false;
      return;
    }
    flushSave(ws);
  });
}

async function persistAndUpdateIndex(active: string, ids: readonly string[]): Promise<void> {
  await saveIndex({ active, ids });
}

async function refreshWorkspaceList(): Promise<void> {
  workspaceList.value = await listWorkspaceMetas();
}

export async function hydrateAndStartAutoSave(): Promise<void> {
  await migrateLegacyIfNeeded();

  let idx = await loadIndex();
  let active: Workspace | null = null;

  if (idx) {
    active = await loadWorkspaceById(idx.active);
    if (!active && idx.ids.length > 0) {
      // Active record is missing — fall back to the first valid one.
      for (const candidate of idx.ids) {
        const ws = await loadWorkspaceById(candidate);
        if (ws) {
          active = ws;
          await persistAndUpdateIndex(ws.id, idx.ids);
          idx = { active: ws.id, ids: idx.ids };
          break;
        }
      }
    }
  }

  if (!active) {
    // Cold start (or unrecoverable index): seed a fresh workspace.
    active = createEmptyWorkspace();
    await saveWorkspace(active);
    await persistAndUpdateIndex(active.id, [active.id]);
  }

  workspaceSignal.value = active;
  saveStatus.value = 'saved';
  lastSavedAt.value = active.updatedAt;
  await refreshWorkspaceList();
  void reconcileOrphanRecords();
  startAutoSave();
}

export async function commitCreateWorkspace(name: string = 'New Workspace'): Promise<void> {
  flushSave.flush();
  const next = createEmptyWorkspace(name);
  await saveWorkspace(next);
  const idx = (await loadIndex()) ?? { active: next.id, ids: [] };
  const ids = [...idx.ids, next.id];
  await persistAndUpdateIndex(next.id, ids);
  workspaceSignal.value = next;
  saveStatus.value = 'saved';
  lastSavedAt.value = next.updatedAt;
  await refreshWorkspaceList();
}

/**
 * Import a workspace decoded from a share token. Always lands as a fresh
 * record with a new id (so it doesn't collide with whatever the user already
 * has saved under the original id) and becomes the active workspace.
 */
export async function commitCreateWorkspaceFromShared(
  shared: Workspace,
  _replaceActive: boolean,
): Promise<void> {
  flushSave.flush();
  const at = now();
  const next: Workspace = {
    ...shared,
    id: newId(),
    createdAt: at,
    updatedAt: at,
  };
  await saveWorkspace(next);
  const idx = (await loadIndex()) ?? { active: next.id, ids: [] };
  const ids = [...idx.ids, next.id];
  await persistAndUpdateIndex(next.id, ids);
  workspaceSignal.value = next;
  saveStatus.value = 'saved';
  lastSavedAt.value = next.updatedAt;
  await refreshWorkspaceList();
}

export async function commitSwitchWorkspace(id: string): Promise<void> {
  if (id === workspaceSignal.value.id) return;
  flushSave.flush();
  const target = await loadWorkspaceById(id);
  if (!target) return;
  const idx = (await loadIndex()) ?? { active: id, ids: [id] };
  await persistAndUpdateIndex(id, idx.ids);
  workspaceSignal.value = target;
  saveStatus.value = 'saved';
  lastSavedAt.value = target.updatedAt;
  await refreshWorkspaceList();
}

export async function commitDeleteWorkspace(id: string): Promise<void> {
  flushSave.cancel();
  const idx = await loadIndex();
  if (!idx) return;

  const remaining = idx.ids.filter((x) => x !== id);
  await deleteWorkspaceRecord(id);

  if (remaining.length === 0) {
    // Last workspace deleted — seed a fresh one so the app always has somewhere to land.
    const fresh = createEmptyWorkspace();
    await saveWorkspace(fresh);
    await persistAndUpdateIndex(fresh.id, [fresh.id]);
    workspaceSignal.value = fresh;
    saveStatus.value = 'saved';
    lastSavedAt.value = fresh.updatedAt;
    await refreshWorkspaceList();
    return;
  }

  // If we deleted the active one, switch to the first remaining; otherwise keep the active.
  const nextActiveId = idx.active === id ? (remaining[0] ?? '') : workspaceSignal.value.id;
  const nextActive = await loadWorkspaceById(nextActiveId);
  await persistAndUpdateIndex(nextActiveId, remaining);
  if (nextActive) {
    workspaceSignal.value = nextActive;
    saveStatus.value = 'saved';
    lastSavedAt.value = nextActive.updatedAt;
  }
  await refreshWorkspaceList();
}

/**
 * Nuke every saved workspace and start over from a fresh seed. Used by the
 * "Delete all workspaces" action in the settings menu.
 */
export async function commitResetAllWorkspaces(): Promise<void> {
  flushSave.cancel();
  await clearAllWorkspaces();
  const fresh = createEmptyWorkspace();
  await saveWorkspace(fresh);
  await persistAndUpdateIndex(fresh.id, [fresh.id]);
  workspaceSignal.value = fresh;
  saveStatus.value = 'saved';
  lastSavedAt.value = fresh.updatedAt;
  await refreshWorkspaceList();
}
