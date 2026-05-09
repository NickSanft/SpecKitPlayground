import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildCombinedMarkdown, buildExportTree, DEFAULT_EXPORT_OPTIONS } from './export';
import { parseCombinedMarkdown, parseSpecifyZip } from './import';
import { addFeature, createEmptyWorkspace, setActiveDoc, updateActiveDocContent } from './state';
import { templates } from './templates';
import type { Workspace } from './types';

function withEditedFeature(ws: Workspace, title: string, marker: string): Workspace {
  let next = addFeature(ws, title);
  next = updateActiveDocContent(next, `# ${marker} spec`);
  const featureId = next.features[next.features.length - 1]!.id;
  next = setActiveDoc(next, { kind: 'feature', featureId, doc: 'plan' });
  next = updateActiveDocContent(next, `# ${marker} plan`);
  next = setActiveDoc(next, { kind: 'feature', featureId, doc: 'tasks' });
  next = updateActiveDocContent(next, `# ${marker} tasks`);
  return next;
}

describe('combined-markdown round-trip', () => {
  it('round-trips a workspace with multiple edited features', () => {
    let ws = createEmptyWorkspace('Combined Round Trip');
    ws = updateActiveDocContent(ws, '# Edited constitution body');
    ws = withEditedFeature(ws, 'Auth', 'Auth');
    ws = withEditedFeature(ws, 'Billing', 'Billing');

    const md = buildCombinedMarkdown(ws, DEFAULT_EXPORT_OPTIONS);
    const back = parseCombinedMarkdown(md);
    expect(back).not.toBeNull();
    expect(back?.name).toBe('Combined Round Trip');
    expect(back?.constitution.content).toContain('Edited constitution body');
    expect(back?.features.map((f) => f.title)).toEqual(['Auth', 'Billing']);
    expect(back?.features[0]?.spec.content).toContain('Auth spec');
    expect(back?.features[0]?.plan.content).toContain('Auth plan');
    expect(back?.features[0]?.tasks.content).toContain('Auth tasks');
  });

  it('preserves feature numbering with gaps', () => {
    let ws = createEmptyWorkspace('Gaps');
    ws = withEditedFeature(ws, 'one', 'One');
    ws = withEditedFeature(ws, 'two', 'Two');
    ws = withEditedFeature(ws, 'three', 'Three');
    // Skip number 2 by removing it from the array directly to simulate a deleted feature.
    ws = { ...ws, features: ws.features.filter((f) => f.title !== 'two') };

    const md = buildCombinedMarkdown(ws, DEFAULT_EXPORT_OPTIONS);
    const back = parseCombinedMarkdown(md);
    expect(back?.features.map((f) => f.number)).toEqual([1, 3]);
  });

  it('escapes special characters in workspace and feature names', () => {
    let ws = createEmptyWorkspace('Has "quotes" inside');
    ws = withEditedFeature(ws, 'Auth & Auth', 'A');
    const md = buildCombinedMarkdown(ws, DEFAULT_EXPORT_OPTIONS);
    const back = parseCombinedMarkdown(md);
    expect(back?.name).toBe('Has "quotes" inside');
    expect(back?.features[0]?.title).toBe('Auth & Auth');
  });

  it('returns null when no spk markers are present', () => {
    expect(parseCombinedMarkdown('just some markdown\n\nwith no markers at all')).toBeNull();
  });

  it('fills missing feature docs with template content', () => {
    const md = [
      '<!-- spk:workspace name="X" v="1" -->',
      '',
      '<!-- spk:feature number="1" slug="solo" title="Solo" doc="spec" -->',
      '',
      '# spec only, no plan or tasks',
    ].join('\n');
    const back = parseCombinedMarkdown(md);
    expect(back?.features[0]?.spec.content).toContain('spec only');
    expect(back?.features[0]?.plan.content).toBe(templates.plan);
    expect(back?.features[0]?.tasks.content).toBe(templates.tasks);
  });

  it('drops feature markers with invalid number/slug/title/doc', () => {
    const md = [
      '<!-- spk:workspace name="X" v="1" -->',
      '<!-- spk:feature number="0" slug="bad" title="Bad" doc="spec" -->',
      'body',
      '<!-- spk:feature number="1" slug="" title="No slug" doc="spec" -->',
      'body',
      '<!-- spk:feature number="1" slug="ok" title="OK" doc="bogus" -->',
      'body',
    ].join('\n');
    const back = parseCombinedMarkdown(md);
    expect(back?.features).toEqual([]);
  });

  it('survives CRLF line endings on input', () => {
    let ws = createEmptyWorkspace('CRLF');
    ws = updateActiveDocContent(ws, '# CRLF body');
    const md = buildCombinedMarkdown(ws, DEFAULT_EXPORT_OPTIONS).replace(/\n/g, '\r\n');
    const back = parseCombinedMarkdown(md);
    expect(back?.constitution.content).toContain('CRLF body');
  });
});

describe('zip round-trip via JSZip', () => {
  async function exportAsZip(ws: Workspace): Promise<Blob> {
    const files = buildExportTree(ws, DEFAULT_EXPORT_OPTIONS);
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    return zip.generateAsync({ type: 'blob' });
  }

  it('round-trips a workspace with edited features via the zip path', async () => {
    let ws = createEmptyWorkspace('Zip Round Trip');
    ws = updateActiveDocContent(ws, '# Edited constitution');
    ws = withEditedFeature(ws, 'Round Trip Feature', 'RT');

    const blob = await exportAsZip(ws);
    const back = await parseSpecifyZip(blob);
    expect(back).not.toBeNull();
    expect(back?.constitution.content).toContain('Edited constitution');
    expect(back?.features.length).toBe(1);
    expect(back?.features[0]?.number).toBe(1);
    expect(back?.features[0]?.slug).toBe('round-trip-feature');
    expect(back?.features[0]?.spec.content).toContain('RT spec');
    expect(back?.features[0]?.plan.content).toContain('RT plan');
    expect(back?.features[0]?.tasks.content).toContain('RT tasks');
  });

  it('returns null for an empty zip with no .specify/ content', async () => {
    const zip = new JSZip();
    zip.file('README.md', 'just a readme');
    const blob = await zip.generateAsync({ type: 'blob' });
    expect(await parseSpecifyZip(blob)).toBeNull();
  });

  it('accepts zips where .specify/ is nested under a wrapper directory', async () => {
    const zip = new JSZip();
    zip.file('my-project/.specify/memory/constitution.md', '# Nested constitution');
    zip.file('my-project/.specify/specs/001-feature/spec.md', '# nested spec');
    zip.file('my-project/.specify/specs/001-feature/plan.md', '# nested plan');
    zip.file('my-project/.specify/specs/001-feature/tasks.md', '# nested tasks');
    const blob = await zip.generateAsync({ type: 'blob' });
    const back = await parseSpecifyZip(blob);
    expect(back?.constitution.content).toContain('Nested constitution');
    expect(back?.features[0]?.slug).toBe('feature');
  });

  it('derives a Title-Cased title from the directory slug', async () => {
    const zip = new JSZip();
    zip.file('.specify/memory/constitution.md', '# c');
    zip.file('.specify/specs/001-user-authentication/spec.md', '# spec');
    const blob = await zip.generateAsync({ type: 'blob' });
    const back = await parseSpecifyZip(blob);
    expect(back?.features[0]?.title).toBe('User Authentication');
  });
});
