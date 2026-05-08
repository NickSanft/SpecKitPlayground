import { computed, effect, signal } from '@preact/signals';
import { debounce } from '../utils/debounce';
import { slugify } from '../utils/slug';
import { clearWorkspace, loadWorkspace, saveWorkspace } from './storage';
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
export function resetWorkspace(name?: string): void {
  workspaceSignal.value = createEmptyWorkspace(name);
}

let autoSaveStarted = false;

function startAutoSave(): void {
  if (autoSaveStarted) return;
  autoSaveStarted = true;

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

export async function hydrateAndStartAutoSave(): Promise<void> {
  const saved = await loadWorkspace();
  if (saved) {
    workspaceSignal.value = saved;
    saveStatus.value = 'saved';
    lastSavedAt.value = saved.updatedAt;
  }
  startAutoSave();
}

export async function commitResetWorkspace(): Promise<void> {
  await clearWorkspace();
  workspaceSignal.value = createEmptyWorkspace();
  saveStatus.value = 'idle';
  lastSavedAt.value = null;
}
