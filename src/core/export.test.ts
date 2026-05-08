import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPORT_OPTIONS,
  buildExportTree,
  buildFileTreeView,
  workspaceFilename,
} from './export';
import { addFeature, createEmptyWorkspace, updateActiveDocContent, setActiveDoc } from './state';
import { templates } from './templates';

function paths(workspace: ReturnType<typeof createEmptyWorkspace>, opts = DEFAULT_EXPORT_OPTIONS) {
  return buildExportTree(workspace, opts).map((f) => f.path);
}

describe('buildExportTree', () => {
  it('always emits the constitution and a top-level README', () => {
    const ws = createEmptyWorkspace();
    expect(paths(ws)).toContain('.specify/memory/constitution.md');
    expect(paths(ws)).toContain('README.md');
  });

  it('drops empty features by default', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Untouched');
    expect(paths(ws)).not.toContain('.specify/specs/001-untouched/spec.md');
  });

  it('keeps a feature whose spec has been edited', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Edited');
    ws = updateActiveDocContent(ws, '# Edited spec body');
    expect(paths(ws)).toContain('.specify/specs/001-edited/spec.md');
  });

  it('includes empty features when the option is enabled', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Untouched');
    const list = paths(ws, { ...DEFAULT_EXPORT_OPTIONS, includeEmptyFeatures: true });
    expect(list).toContain('.specify/specs/001-untouched/spec.md');
    expect(list).toContain('.specify/specs/001-untouched/plan.md');
    expect(list).toContain('.specify/specs/001-untouched/tasks.md');
  });

  it('emits 3 template files under .specify/templates by default', () => {
    const ws = createEmptyWorkspace();
    const list = paths(ws);
    expect(list).toContain('.specify/templates/spec-template.md');
    expect(list).toContain('.specify/templates/plan-template.md');
    expect(list).toContain('.specify/templates/tasks-template.md');
  });

  it('omits the templates folder when the option is disabled', () => {
    const ws = createEmptyWorkspace();
    const list = paths(ws, { ...DEFAULT_EXPORT_OPTIONS, includeTemplates: false });
    expect(list.filter((p) => p.startsWith('.specify/templates/'))).toEqual([]);
  });

  it('uses NNN-slug directory names with zero-padded numbers', () => {
    let ws = createEmptyWorkspace();
    for (let i = 0; i < 10; i += 1) {
      ws = addFeature(ws, `feature ${i}`);
      // Edit the spec to keep it from being filtered as empty
      ws = updateActiveDocContent(ws, `edited ${i}`);
    }
    const list = paths(ws);
    expect(list).toContain('.specify/specs/001-feature-0/spec.md');
    expect(list).toContain('.specify/specs/010-feature-9/spec.md');
  });

  it('preserves number gaps after deletions', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'one');
    ws = updateActiveDocContent(ws, 'one edit');
    ws = addFeature(ws, 'two');
    ws = updateActiveDocContent(ws, 'two edit');
    ws = addFeature(ws, 'three');
    ws = updateActiveDocContent(ws, 'three edit');
    // Delete feature 2 by id
    const second = ws.features.find((f) => f.title === 'two')!;
    ws = {
      ...ws,
      features: ws.features.filter((f) => f.id !== second.id),
    };
    ws = addFeature(ws, 'four');
    ws = updateActiveDocContent(ws, 'four edit');
    const list = paths(ws);
    expect(list).toContain('.specify/specs/001-one/spec.md');
    expect(list).toContain('.specify/specs/003-three/spec.md');
    expect(list).toContain('.specify/specs/004-four/spec.md');
    expect(list.some((p) => p.includes('002-'))).toBe(false);
  });

  it('every file content ends with a newline (no missing trailing LF)', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'lf check');
    ws = updateActiveDocContent(ws, 'no trailing newline');
    const files = buildExportTree(ws, { ...DEFAULT_EXPORT_OPTIONS, includeEmptyFeatures: true });
    for (const file of files) {
      expect(file.content.endsWith('\n'), `file ${file.path} must end with \\n`).toBe(true);
    }
  });

  it('uses LF line endings only — never CRLF', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'crlf check');
    ws = updateActiveDocContent(ws, '# heading\nbody');
    const files = buildExportTree(ws, DEFAULT_EXPORT_OPTIONS);
    for (const file of files) {
      expect(file.content.includes('\r\n'), `file ${file.path} must not contain CRLF`).toBe(false);
    }
  });

  it('emits all three feature docs with the correct content for an edited feature', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Multi Doc');
    ws = updateActiveDocContent(ws, '# Marker spec');
    const featureId = ws.features[0]!.id;
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'plan' });
    ws = updateActiveDocContent(ws, '# Marker plan');
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'tasks' });
    ws = updateActiveDocContent(ws, '# Marker tasks');

    const files = buildExportTree(ws, DEFAULT_EXPORT_OPTIONS);
    const spec = files.find((f) => f.path.endsWith('-multi-doc/spec.md'));
    const plan = files.find((f) => f.path.endsWith('-multi-doc/plan.md'));
    const tasks = files.find((f) => f.path.endsWith('-multi-doc/tasks.md'));
    expect(spec?.content).toContain('Marker spec');
    expect(plan?.content).toContain('Marker plan');
    expect(tasks?.content).toContain('Marker tasks');
  });

  it('uses the upstream template content for the templates folder, not user edits', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'isolation');
    ws = updateActiveDocContent(ws, 'user edit must not leak into templates');
    const files = buildExportTree(ws, DEFAULT_EXPORT_OPTIONS);
    const tpl = files.find((f) => f.path === '.specify/templates/spec-template.md');
    expect(tpl?.content).toBe(templates.spec);
  });
});

describe('buildFileTreeView', () => {
  it('groups files into a sorted directory tree', () => {
    const tree = buildFileTreeView([
      { path: '.specify/memory/constitution.md', content: '' },
      { path: '.specify/specs/001-a/spec.md', content: '' },
      { path: '.specify/specs/001-a/plan.md', content: '' },
      { path: 'README.md', content: '' },
    ]);
    // Top level: directories first, then README.md
    expect(tree.map((n) => n.name)).toEqual(['.specify', 'README.md']);
    const specify = tree[0]!;
    expect(specify.isDir).toBe(true);
    expect(specify.children?.map((c) => c.name)).toEqual(['memory', 'specs']);
    const specs = specify.children?.[1];
    expect(specs?.children?.[0]?.children?.map((c) => c.name)).toEqual(['plan.md', 'spec.md']);
  });
});

describe('workspaceFilename', () => {
  it('slugifies the workspace name', () => {
    const ws = createEmptyWorkspace('My Cool Project');
    expect(workspaceFilename(ws)).toBe('my-cool-project.zip');
  });

  it('falls back to a generic name for unhelpful workspace names', () => {
    const ws = createEmptyWorkspace('!!!');
    expect(workspaceFilename(ws)).toBe('feature.zip');
  });
});
