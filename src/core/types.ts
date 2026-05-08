export interface Document {
  content: string;
  updatedAt: number;
}

export interface Feature {
  id: string;
  number: number;
  slug: string;
  title: string;
  spec: Document;
  plan: Document;
  tasks: Document;
  createdAt: number;
}

export type FeatureDocKind = 'spec' | 'plan' | 'tasks';

export type ActiveDocId =
  | { kind: 'constitution' }
  | { kind: 'feature'; featureId: string; doc: FeatureDocKind };

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  constitution: Document;
  features: Feature[];
  activeDocId: ActiveDocId;
}

export interface FeatureDocLocator {
  featureId: string;
  doc: FeatureDocKind;
}

export function activeDocsAreEqual(a: ActiveDocId, b: ActiveDocId): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'constitution') return true;
  if (a.kind === 'feature' && b.kind === 'feature') {
    return a.featureId === b.featureId && a.doc === b.doc;
  }
  return false;
}
