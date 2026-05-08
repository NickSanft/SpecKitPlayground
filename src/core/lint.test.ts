import { describe, expect, it } from 'vitest';
import { diagnosticCounts, getRules, lintWorkspace } from './lint';
import { addFeature, createEmptyWorkspace, setActiveDoc, updateActiveDocContent } from './state';
describe('rule registry', () => {
  it('exposes a non-empty pluggable rule set', () => {
    const rules = getRules();
    expect(rules.length).toBeGreaterThanOrEqual(5);
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.size).toBe(rules.length);
  });

  it('every rule has an id and a description', () => {
    for (const rule of getRules()) {
      expect(rule.id).toBeTruthy();
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
});

describe('constitution-not-default', () => {
  it('flags an unedited constitution', () => {
    const ws = createEmptyWorkspace();
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'constitution-not-default')).toBeDefined();
  });

  it('clears once the constitution is edited', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Custom constitution\n\n### One\n### Two\n### Three\n');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'constitution-not-default')).toBeUndefined();
  });
});

describe('constitution-principles-count', () => {
  it('does not run on the unedited template (handled by another rule)', () => {
    const ws = createEmptyWorkspace();
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'constitution-principles-count')).toBeUndefined();
  });

  it('warns when an edited constitution has fewer than 3 ### headings', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Edited\n\n### One\n### Two\n');
    const ds = lintWorkspace(ws);
    const hit = ds.find((d) => d.ruleId === 'constitution-principles-count');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('warning');
  });

  it('passes when ≥3 principles are present', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(
      ws,
      '# Edited\n\n### Principle One\n### Principle Two\n### Principle Three\n',
    );
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'constitution-principles-count')).toBeUndefined();
  });
});

describe('placeholders-remain', () => {
  it('suppresses placeholders when the doc is the unedited template', () => {
    const ws = createEmptyWorkspace();
    const ds = lintWorkspace(ws);
    // constitution still equals templates.constitution → no placeholder warning for it
    const hits = ds.filter(
      (d) => d.ruleId === 'placeholders-remain' && d.target.kind === 'constitution',
    );
    expect(hits).toEqual([]);
  });

  it('flags placeholders that survive an edit', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, 'Edited but [PROJECT_NAME] remains');
    const ds = lintWorkspace(ws);
    const hit = ds.find((d) => d.ruleId === 'placeholders-remain');
    expect(hit).toBeDefined();
    expect(hit?.message).toContain('[PROJECT_NAME]');
  });

  it('skips lowercase brackets like [link text]', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, 'Edited body with [a link](https://x) and nothing else');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'placeholders-remain')).toBeUndefined();
  });
});

describe('needs-clarification', () => {
  it('flags [NEEDS CLARIFICATION ...] markers in any doc', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'Audit');
    ws = updateActiveDocContent(ws, '# Spec\n[NEEDS CLARIFICATION: which auth provider?]');
    const ds = lintWorkspace(ws);
    const hit = ds.find((d) => d.ruleId === 'needs-clarification');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('warning');
  });
});

describe('tasks-has-checkboxes', () => {
  it('flags an edited tasks.md with no checkboxes', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'tasks check');
    const featureId = ws.features[0]!.id;
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'tasks' });
    ws = updateActiveDocContent(ws, '# Tasks\n\nJust prose, no boxes here.');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'tasks-has-checkboxes')).toBeDefined();
  });

  it('passes when the tasks doc has at least one - [ ] line', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'tasks ok');
    const featureId = ws.features[0]!.id;
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'tasks' });
    ws = updateActiveDocContent(ws, '# Tasks\n\n- [ ] Do the thing\n- [x] Already done\n');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'tasks-has-checkboxes')).toBeUndefined();
  });
});

describe('feature-untouched', () => {
  it('flags features whose spec, plan, and tasks are all the unedited template', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'untouched');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'feature-untouched')).toBeDefined();
  });

  it('clears once any of the three feature docs is edited', () => {
    let ws = createEmptyWorkspace();
    ws = addFeature(ws, 'edited spec');
    ws = updateActiveDocContent(ws, '# my spec body');
    const ds = lintWorkspace(ws);
    expect(ds.find((d) => d.ruleId === 'feature-untouched')).toBeUndefined();
  });
});

describe('lintWorkspace + diagnosticCounts', () => {
  it('returns diagnostics ordered by rule registration', () => {
    const ws = createEmptyWorkspace();
    const ds = lintWorkspace(ws);
    // First diagnostic should be the constitution-not-default one (it's the first rule)
    expect(ds[0]?.ruleId).toBe('constitution-not-default');
  });

  it('counts severities accurately', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, 'Edited\n[NEEDS CLARIFICATION: x]\n[PROJECT_NAME]\n');
    const counts = diagnosticCounts(lintWorkspace(ws));
    expect(counts.warning + counts.info).toBeGreaterThan(0);
  });

  it('is empty for a workspace where every doc is fully edited and clean', () => {
    let ws = createEmptyWorkspace();
    ws = updateActiveDocContent(ws, '# Constitution\n\n### A\n### B\n### C\n\nGovernance prose.');
    ws = addFeature(ws, 'Clean Feature');
    const featureId = ws.features[0]!.id;
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'spec' });
    ws = updateActiveDocContent(ws, '# Spec body, no placeholders.');
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'plan' });
    ws = updateActiveDocContent(ws, '# Plan body, no placeholders.');
    ws = setActiveDoc(ws, { kind: 'feature', featureId, doc: 'tasks' });
    ws = updateActiveDocContent(ws, '# Tasks\n\n- [ ] Build it\n- [ ] Test it\n');
    const ds = lintWorkspace(ws);
    expect(ds).toEqual([]);
  });
});
