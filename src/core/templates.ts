import constitutionTemplate from '../templates/constitution.md?raw';
import planTemplate from '../templates/plan.md?raw';
import specTemplate from '../templates/spec.md?raw';
import tasksTemplate from '../templates/tasks.md?raw';

export const templates = {
  constitution: constitutionTemplate,
  spec: specTemplate,
  plan: planTemplate,
  tasks: tasksTemplate,
} as const;

export type TemplateKind = keyof typeof templates;

export function getTemplate(kind: TemplateKind): string {
  return templates[kind];
}
