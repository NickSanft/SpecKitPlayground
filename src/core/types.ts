export interface Document {
  content: string;
  updatedAt: number;
  /**
   * Optional baseline content used by the diff view. Set on workspace
   * creation, import, and the explicit "Mark current as baseline" action.
   * Older persisted records without a baseline default to the current
   * content (effectively "no diff yet") via storage's deserializer.
   */
  baseline?: string;
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
