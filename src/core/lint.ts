import { templates } from './templates';
import type { ActiveDocId, Document, Feature, Workspace } from './types';

export type Severity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  ruleId: string;
  severity: Severity;
  message: string;
  target: ActiveDocId;
  targetLabel: string;
}

export interface Rule {
  id: string;
  description: string;
  check: (workspace: Workspace) => Diagnostic[];
}

const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9_ ]+\]/g;
const NEEDS_CLARIFICATION_RE = /\[NEEDS CLARIFICATION/i;

function constitutionTarget(): ActiveDocId {
  return { kind: 'constitution' };
}

function featureTarget(featureId: string, doc: 'spec' | 'plan' | 'tasks'): ActiveDocId {
  return { kind: 'feature', featureId, doc };
}

function featureLabel(feature: Feature, doc: 'spec' | 'plan' | 'tasks'): string {
  return `${doc}.md — ${feature.title}`;
}

function isUntouched(doc: Document, template: string): boolean {
  return doc.content === template;
}

function countH3Sections(content: string): number {
  return content.split('\n').filter((line) => /^###\s+\S/.test(line)).length;
}

function findPlaceholderSamples(content: string): string[] {
  const matches = content.match(PLACEHOLDER_RE) ?? [];
  return Array.from(new Set(matches));
}

function hasCheckboxes(content: string): boolean {
  return /^[\s>]*[-*]\s+\[[ xX]\]/m.test(content);
}

const rules: readonly Rule[] = [
  {
    id: 'constitution-not-default',
    description: 'Constitution should be edited to reflect your project, not left as the template.',
    check(ws) {
      if (!isUntouched(ws.constitution, templates.constitution)) return [];
      return [
        {
          ruleId: 'constitution-not-default',
          severity: 'warning',
          message: 'Constitution is still the unedited template.',
          target: constitutionTarget(),
          targetLabel: 'constitution.md',
        },
      ];
    },
  },
  {
    id: 'constitution-principles-count',
    description: 'A useful constitution has at least 3 core principles.',
    check(ws) {
      if (isUntouched(ws.constitution, templates.constitution)) return [];
      const count = countH3Sections(ws.constitution.content);
      if (count >= 3) return [];
      return [
        {
          ruleId: 'constitution-principles-count',
          severity: 'warning',
          message: `Constitution has ${count} ### heading${count === 1 ? '' : 's'}; aim for at least 3 core principles.`,
          target: constitutionTarget(),
          targetLabel: 'constitution.md',
        },
      ];
    },
  },
  {
    id: 'placeholders-remain',
    description: 'Square-bracket placeholders like [FEATURE NAME] should be filled in.',
    check(ws) {
      const out: Diagnostic[] = [];

      const cSamples = findPlaceholderSamples(ws.constitution.content);
      if (cSamples.length > 0 && !isUntouched(ws.constitution, templates.constitution)) {
        out.push({
          ruleId: 'placeholders-remain',
          severity: 'info',
          message: `Constitution has unresolved placeholders: ${cSamples.slice(0, 3).join(', ')}${
            cSamples.length > 3 ? '…' : ''
          }`,
          target: constitutionTarget(),
          targetLabel: 'constitution.md',
        });
      }

      for (const feature of ws.features) {
        for (const doc of ['spec', 'plan', 'tasks'] as const) {
          const docState = feature[doc];
          if (isUntouched(docState, templates[doc])) continue;
          const samples = findPlaceholderSamples(docState.content);
          if (samples.length === 0) continue;
          out.push({
            ruleId: 'placeholders-remain',
            severity: 'info',
            message: `${doc}.md has unresolved placeholders: ${samples.slice(0, 3).join(', ')}${
              samples.length > 3 ? '…' : ''
            }`,
            target: featureTarget(feature.id, doc),
            targetLabel: featureLabel(feature, doc),
          });
        }
      }

      return out;
    },
  },
  {
    id: 'needs-clarification',
    description: '[NEEDS CLARIFICATION ...] markers should be resolved before export.',
    check(ws) {
      const out: Diagnostic[] = [];

      if (NEEDS_CLARIFICATION_RE.test(ws.constitution.content)) {
        out.push({
          ruleId: 'needs-clarification',
          severity: 'warning',
          message: 'Constitution still contains [NEEDS CLARIFICATION] markers.',
          target: constitutionTarget(),
          targetLabel: 'constitution.md',
        });
      }

      for (const feature of ws.features) {
        for (const doc of ['spec', 'plan', 'tasks'] as const) {
          if (NEEDS_CLARIFICATION_RE.test(feature[doc].content)) {
            out.push({
              ruleId: 'needs-clarification',
              severity: 'warning',
              message: `${doc}.md still contains [NEEDS CLARIFICATION] markers.`,
              target: featureTarget(feature.id, doc),
              targetLabel: featureLabel(feature, doc),
            });
          }
        }
      }

      return out;
    },
  },
  {
    id: 'tasks-has-checkboxes',
    description: 'A tasks doc should contain at least one - [ ] checkbox to track work.',
    check(ws) {
      const out: Diagnostic[] = [];
      for (const feature of ws.features) {
        if (isUntouched(feature.tasks, templates.tasks)) continue;
        if (hasCheckboxes(feature.tasks.content)) continue;
        out.push({
          ruleId: 'tasks-has-checkboxes',
          severity: 'info',
          message: `tasks.md has no checklist items (- [ ] ...).`,
          target: featureTarget(feature.id, 'tasks'),
          targetLabel: featureLabel(feature, 'tasks'),
        });
      }
      return out;
    },
  },
  {
    id: 'feature-untouched',
    description:
      'Features whose spec/plan/tasks are all the unedited template have no content yet.',
    check(ws) {
      const out: Diagnostic[] = [];
      for (const feature of ws.features) {
        if (
          isUntouched(feature.spec, templates.spec) &&
          isUntouched(feature.plan, templates.plan) &&
          isUntouched(feature.tasks, templates.tasks)
        ) {
          out.push({
            ruleId: 'feature-untouched',
            severity: 'info',
            message: `Feature "${feature.title}" has no content yet (all three docs are still the template).`,
            target: featureTarget(feature.id, 'spec'),
            targetLabel: featureLabel(feature, 'spec'),
          });
        }
      }
      return out;
    },
  },
];

export function getRules(): readonly Rule[] {
  return rules;
}

export function isRuleEnabled(workspace: Workspace, ruleId: string): boolean {
  return !workspace.lintConfig?.disabled.includes(ruleId);
}

export function lintWorkspace(workspace: Workspace): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const rule of rules) {
    if (!isRuleEnabled(workspace, rule.id)) continue;
    out.push(...rule.check(workspace));
  }
  return out;
}

export function diagnosticCounts(diagnostics: readonly Diagnostic[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const d of diagnostics) counts[d.severity] += 1;
  return counts;
}
