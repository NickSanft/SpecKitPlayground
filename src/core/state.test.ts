import { describe, expect, it } from 'vitest';
import {
  addFeature,
  createEmptyWorkspace,
  deleteFeature,
  getActiveDocContent,
  renameFeature,
  renameWorkspace,
  setActiveDoc,
  setLintRuleEnabled,
  updateActiveDocContent,
} from './state';
import { templates } from './templates';
import type { Workspace } from './types';

function withFeature(ws: Workspace, title: string): { ws: Workspace; featureId: string } {
  const next = addFeature(ws, title);
  const newFeature = next.features[next.features.length - 1];
  if (!newFeature) throw new Error('expected a new feature');
  return { ws: next, featureId: newFeature.id };
}

describe('createEmptyWorkspace', () => {
  it('seeds the constitution from the template', () => {
    const ws = createEmptyWorkspace();
    expect(ws.constitution.content).toBe(templates.constitution);
  });

  it('starts with no features and the constitution active', () => {
    const ws = createEmptyWorkspace();
    expect(ws.features).toEqual([]);
    expect(ws.activeDocId).toEqual({ kind: 'constitution' });
  });
});

describe('addFeature', () => {
  it('seeds spec/plan/tasks from templates', () => {
    const { ws } = withFeature(createEmptyWorkspace(), 'User Auth');
    const f = ws.features[0];
    expect(f).toBeDefined();
    expect(f?.spec.content).toBe(templates.spec);
    expect(f?.plan.content).toBe(templates.plan);
    expect(f?.tasks.content).toBe(templates.tasks);
  });

  it('numbers features 1, 2, 3...', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'one');
    ws = addFeature(ws, 'two');
    ws = addFeature(ws, 'three');
    expect(ws.features.map((f) => f.number)).toEqual([1, 2, 3]);
  });

  it('does NOT recycle numbers when a feature is deleted', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'one');
    ws = addFeature(ws, 'two');
    ws = addFeature(ws, 'three');
    const second = ws.features[1];
    expect(second).toBeDefined();
    ws = deleteFeature(ws, second!.id);
    ws = addFeature(ws, 'four');
    expect(ws.features.map((f) => f.number)).toEqual([1, 3, 4]);
  });

  it('derives slug from title', () => {
    const { ws } = withFeature(createEmptyWorkspace(), 'User Authentication!');
    expect(ws.features[0]?.slug).toBe('user-authentication');
  });

  it('makes the new feature the active doc on its spec', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'one');
    expect(ws.activeDocId).toEqual({ kind: 'feature', featureId, doc: 'spec' });
  });

  it('rejects empty / whitespace-only titles', () => {
    const before = createEmptyWorkspace();
    expect(addFeature(before, '')).toBe(before);
    expect(addFeature(before, '   ')).toBe(before);
  });

  it('trims surrounding whitespace from titles', () => {
    const { ws } = withFeature(createEmptyWorkspace(), '   User Auth   ');
    expect(ws.features[0]?.title).toBe('User Auth');
  });
});

describe('renameFeature', () => {
  it('updates title and slug', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'old name');
    const renamed = renameFeature(ws, featureId, 'New Name');
    const f = renamed.features.find((x) => x.id === featureId);
    expect(f?.title).toBe('New Name');
    expect(f?.slug).toBe('new-name');
  });

  it('does not change the feature number', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'first');
    const renamed = renameFeature(ws, featureId, 'something else');
    expect(renamed.features.find((x) => x.id === featureId)?.number).toBe(1);
  });

  it('rejects empty rename input', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'first');
    expect(renameFeature(ws, featureId, '')).toBe(ws);
    expect(renameFeature(ws, featureId, '   ')).toBe(ws);
  });

  it('is a no-op for non-existent ids', () => {
    const { ws } = withFeature(createEmptyWorkspace(), 'first');
    const after = renameFeature(ws, 'no-such-id', 'whatever');
    expect(after.features).toEqual(ws.features);
  });
});

describe('deleteFeature', () => {
  it('removes the feature', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'gone');
    const after = deleteFeature(ws, featureId);
    expect(after.features.find((f) => f.id === featureId)).toBeUndefined();
  });

  it('falls back to the constitution when the active feature is deleted', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'active');
    const after = deleteFeature(ws, featureId);
    expect(after.activeDocId).toEqual({ kind: 'constitution' });
  });

  it('keeps the active doc when deleting a different feature', () => {
    let ws = createEmptyWorkspace();
    const a = addFeature(ws, 'a');
    ws = addFeature(a, 'b');
    const featureA = a.features[0];
    expect(featureA).toBeDefined();
    const before = ws.activeDocId;
    const after = deleteFeature(ws, featureA!.id);
    expect(after.activeDocId).toEqual(before);
  });

  it('is a no-op for non-existent ids', () => {
    const { ws } = withFeature(createEmptyWorkspace(), 'one');
    expect(deleteFeature(ws, 'nope')).toBe(ws);
  });
});

describe('setActiveDoc', () => {
  it('switches between constitution and a feature doc', () => {
    const { ws, featureId } = withFeature(createEmptyWorkspace(), 'one');
    const onConstitution = setActiveDoc(ws, { kind: 'constitution' });
    expect(onConstitution.activeDocId).toEqual({ kind: 'constitution' });

    const onPlan = setActiveDoc(onConstitution, { kind: 'feature', featureId, doc: 'plan' });
    expect(onPlan.activeDocId).toEqual({ kind: 'feature', featureId, doc: 'plan' });
  });

  it('rejects feature ids that do not exist', () => {
    const ws = createEmptyWorkspace();
    const after = setActiveDoc(ws, { kind: 'feature', featureId: 'missing', doc: 'spec' });
    expect(after).toBe(ws);
  });

  it('returns the same reference when nothing changed', () => {
    const ws = createEmptyWorkspace();
    const after = setActiveDoc(ws, { kind: 'constitution' });
    expect(after).toBe(ws);
  });
});

describe('updateActiveDocContent', () => {
  it('updates the constitution when active', () => {
    const ws = createEmptyWorkspace();
    const after = updateActiveDocContent(ws, '# different');
    expect(after.constitution.content).toBe('# different');
  });

  it('updates the targeted feature doc when active', () => {
    const { ws } = withFeature(createEmptyWorkspace(), 'one'); // active = spec
    const after = updateActiveDocContent(ws, '# new spec');
    expect(after.features[0]?.spec.content).toBe('# new spec');
    expect(after.features[0]?.plan.content).toBe(ws.features[0]?.plan.content);
  });

  it('does not mutate the input workspace', () => {
    const ws = createEmptyWorkspace();
    const before = ws.constitution.content;
    updateActiveDocContent(ws, '# different');
    expect(ws.constitution.content).toBe(before);
  });

  it('returns the same reference if content did not change', () => {
    const ws = createEmptyWorkspace();
    const same = updateActiveDocContent(ws, ws.constitution.content);
    expect(same).toBe(ws);
  });
});

describe('renameWorkspace', () => {
  it('updates the workspace name', () => {
    const ws = createEmptyWorkspace('Old');
    const renamed = renameWorkspace(ws, 'New Name');
    expect(renamed.name).toBe('New Name');
  });

  it('trims whitespace from the input', () => {
    const ws = createEmptyWorkspace('Old');
    const renamed = renameWorkspace(ws, '   Trimmed   ');
    expect(renamed.name).toBe('Trimmed');
  });

  it('rejects empty input as a no-op (same reference)', () => {
    const ws = createEmptyWorkspace('Old');
    expect(renameWorkspace(ws, '')).toBe(ws);
    expect(renameWorkspace(ws, '   ')).toBe(ws);
  });

  it('returns the same reference when the trimmed name equals the current one', () => {
    const ws = createEmptyWorkspace('Same');
    expect(renameWorkspace(ws, '  Same  ')).toBe(ws);
  });

  it('does not change the workspace id', () => {
    const ws = createEmptyWorkspace('Old');
    const renamed = renameWorkspace(ws, 'New');
    expect(renamed.id).toBe(ws.id);
  });
});

describe('setLintRuleEnabled', () => {
  it('disables a rule by adding it to lintConfig.disabled', () => {
    const ws = createEmptyWorkspace();
    const after = setLintRuleEnabled(ws, 'placeholders-remain', false);
    expect(after.lintConfig?.disabled).toEqual(['placeholders-remain']);
  });

  it('re-enables a rule by removing it from lintConfig.disabled', () => {
    let ws = createEmptyWorkspace();
    ws = setLintRuleEnabled(ws, 'placeholders-remain', false);
    ws = setLintRuleEnabled(ws, 'placeholders-remain', true);
    expect(ws.lintConfig?.disabled ?? []).toEqual([]);
  });

  it('returns the same reference if the toggle is a no-op', () => {
    const ws = createEmptyWorkspace();
    expect(setLintRuleEnabled(ws, 'never-disabled', true)).toBe(ws);
    let modified = setLintRuleEnabled(ws, 'placeholders-remain', false);
    expect(setLintRuleEnabled(modified, 'placeholders-remain', false)).toBe(modified);
  });

  it('does not double-add the same rule when called twice', () => {
    let ws = createEmptyWorkspace();
    ws = setLintRuleEnabled(ws, 'r', false);
    ws = setLintRuleEnabled(ws, 'r', false);
    expect(ws.lintConfig?.disabled).toEqual(['r']);
  });
});

describe('getActiveDocContent', () => {
  it('returns the right content for whichever doc is active', () => {
    let ws = createEmptyWorkspace();
    expect(getActiveDocContent(ws)).toBe(ws.constitution.content);
    ws = addFeature(ws, 'one');
    expect(getActiveDocContent(ws)).toBe(ws.features[0]?.spec.content);
    ws = setActiveDoc(ws, { kind: 'feature', featureId: ws.features[0]!.id, doc: 'tasks' });
    expect(getActiveDocContent(ws)).toBe(ws.features[0]?.tasks.content);
  });
});
