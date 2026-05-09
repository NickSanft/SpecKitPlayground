import JSZip from 'jszip';
import { templates } from './templates';
import type { Document, Feature, Workspace } from './types';

const MARKER_RE = /^<!-- spk:(\S+)((?:\s+\w+="(?:[^"\\]|\\.)*")*) -->\s*$/;
const ATTR_RE = /\s+(\w+)=("(?:[^"\\]|\\.)*")/g;

interface Marker {
  kind: string;
  attrs: Record<string, string>;
}

function parseMarker(line: string): Marker | null {
  const m = MARKER_RE.exec(line);
  if (!m) return null;
  const kind = m[1];
  const rest = m[2] ?? '';
  if (!kind) return null;
  const attrs: Record<string, string> = {};
  for (const a of rest.matchAll(ATTR_RE)) {
    const k = a[1];
    const v = a[2];
    if (!k || v === undefined) continue;
    try {
      attrs[k] = JSON.parse(v) as string;
    } catch {
      // skip malformed attribute
    }
  }
  return { kind, attrs };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
}

function trimBody(lines: string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === '') start += 1;
  while (end > start && lines[end - 1] === '') end -= 1;
  return lines.slice(start, end).join('\n');
}

function newDocument(content: string, at: number): Document {
  return { content, updatedAt: at, baseline: content };
}

interface FeatureBuilder {
  number: number;
  slug: string;
  title: string;
  spec?: string;
  plan?: string;
  tasks?: string;
}

/**
 * Parse the playground's combined-markdown format back into a workspace.
 * Returns null when the input has no usable spk markers at all (so callers
 * can distinguish "wrong format" from "empty workspace").
 */
export function parseCombinedMarkdown(text: string): Workspace | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const at = Date.now();

  let workspaceName = 'Imported Workspace';
  const featureMap = new Map<number, FeatureBuilder>();
  let constitutionBody: string | null = null;

  let currentTarget:
    | { kind: 'constitution' }
    | { kind: 'feature'; number: number; doc: 'spec' | 'plan' | 'tasks' }
    | null = null;
  let currentBody: string[] = [];
  let sawAnyMarker = false;

  function commit() {
    if (!currentTarget) return;
    const body = trimBody(currentBody);
    if (currentTarget.kind === 'constitution') {
      constitutionBody = body;
    } else {
      const f = featureMap.get(currentTarget.number);
      if (f) f[currentTarget.doc] = body;
    }
    currentBody = [];
  }

  for (const line of lines) {
    const m = parseMarker(line);
    if (m) {
      sawAnyMarker = true;
      commit();
      currentTarget = null;
      if (m.kind === 'workspace') {
        const n = m.attrs['name'];
        if (typeof n === 'string' && n.trim().length > 0) workspaceName = n.trim();
      } else if (m.kind === 'constitution') {
        currentTarget = { kind: 'constitution' };
      } else if (m.kind === 'feature') {
        const number = Number.parseInt(m.attrs['number'] ?? '', 10);
        const slug = (m.attrs['slug'] ?? '').trim();
        const title = (m.attrs['title'] ?? '').trim();
        const doc = m.attrs['doc'];
        if (
          Number.isFinite(number) &&
          number > 0 &&
          slug &&
          title &&
          (doc === 'spec' || doc === 'plan' || doc === 'tasks')
        ) {
          if (!featureMap.has(number)) {
            featureMap.set(number, { number, slug, title });
          }
          currentTarget = { kind: 'feature', number, doc };
        }
      }
      continue;
    }
    if (currentTarget) currentBody.push(line);
  }
  commit();

  if (!sawAnyMarker) return null;

  const features: Feature[] = Array.from(featureMap.values())
    .sort((a, b) => a.number - b.number)
    .map((f) => ({
      id: newId(),
      number: f.number,
      slug: f.slug,
      title: f.title,
      spec: newDocument(f.spec ?? templates.spec, at),
      plan: newDocument(f.plan ?? templates.plan, at),
      tasks: newDocument(f.tasks ?? templates.tasks, at),
      createdAt: at,
    }));

  return {
    id: newId(),
    name: workspaceName,
    createdAt: at,
    updatedAt: at,
    constitution: newDocument(constitutionBody ?? templates.constitution, at),
    features,
    activeDocId: { kind: 'constitution' },
  };
}

const ZIP_FEATURE_DIR_RE = /^(?:.*\/)?\.specify\/specs\/(\d{1,4})-([a-z0-9][a-z0-9-]*)\/$/;
const ZIP_FEATURE_FILE_RE =
  /^(?:.*\/)?\.specify\/specs\/(\d{1,4})-([a-z0-9][a-z0-9-]*)\/(spec|plan|tasks)\.md$/;
const ZIP_CONSTITUTION_RE = /^(?:.*\/)?\.specify\/memory\/constitution\.md$/;

interface ZipFeatureBuilder {
  number: number;
  slug: string;
  spec?: string;
  plan?: string;
  tasks?: string;
}

/**
 * Parse a `.specify/`-style zip into a workspace. The `.specify/` directory
 * may live at the zip root or nested under a wrapper directory; both work.
 * Returns null if no `constitution.md` and no feature docs are found
 * (so dropping a random zip on the app surfaces an error instead of
 * silently importing an empty workspace).
 */
export async function parseSpecifyZip(file: File | Blob): Promise<Workspace | null> {
  const zip = await JSZip.loadAsync(file);
  const at = Date.now();

  let constitutionContent: string | null = null;
  const features = new Map<number, ZipFeatureBuilder>();

  // Pre-walk to register feature directories (so we have slugs/numbers even
  // if the spec/plan/tasks files are missing).
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      const dirMatch = ZIP_FEATURE_DIR_RE.exec(entry.name);
      if (dirMatch) {
        const number = Number.parseInt(dirMatch[1] ?? '', 10);
        const slug = dirMatch[2] ?? '';
        if (Number.isFinite(number) && number > 0 && slug) {
          if (!features.has(number)) features.set(number, { number, slug });
        }
      }
    }
  }

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    if (ZIP_CONSTITUTION_RE.test(entry.name)) {
      constitutionContent = await entry.async('string');
      continue;
    }
    const m = ZIP_FEATURE_FILE_RE.exec(entry.name);
    if (m) {
      const number = Number.parseInt(m[1] ?? '', 10);
      const slug = m[2] ?? '';
      const doc = m[3] as 'spec' | 'plan' | 'tasks';
      if (!Number.isFinite(number) || number <= 0 || !slug) continue;
      const f = features.get(number) ?? { number, slug };
      f.slug = slug;
      f[doc] = await entry.async('string');
      features.set(number, f);
    }
  }

  if (constitutionContent === null && features.size === 0) return null;

  const featureList: Feature[] = Array.from(features.values())
    .sort((a, b) => a.number - b.number)
    .map((f) => ({
      id: newId(),
      number: f.number,
      slug: f.slug,
      title: titleFromSlug(f.slug),
      spec: newDocument(f.spec ?? templates.spec, at),
      plan: newDocument(f.plan ?? templates.plan, at),
      tasks: newDocument(f.tasks ?? templates.tasks, at),
      createdAt: at,
    }));

  return {
    id: newId(),
    name: 'Imported Workspace',
    createdAt: at,
    updatedAt: at,
    constitution: newDocument(constitutionContent ?? templates.constitution, at),
    features: featureList,
    activeDocId: { kind: 'constitution' },
  };
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(' ');
}

export type ImportSource = 'zip' | 'combined-md';

export interface ImportResult {
  workspace: Workspace;
  source: ImportSource;
}

/**
 * Best-effort import that tries both formats based on the file extension
 * with a content-type fallback. Returns null on parse failure.
 */
export async function importFromFile(file: File): Promise<ImportResult | null> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip') || file.type === 'application/zip') {
    const ws = await parseSpecifyZip(file);
    return ws ? { workspace: ws, source: 'zip' } : null;
  }
  if (lower.endsWith('.md') || lower.endsWith('.markdown') || file.type.startsWith('text/')) {
    const text = await file.text();
    const ws = parseCombinedMarkdown(text);
    return ws ? { workspace: ws, source: 'combined-md' } : null;
  }
  // Last-ditch: try as text → combined markdown.
  try {
    const text = await file.text();
    const ws = parseCombinedMarkdown(text);
    return ws ? { workspace: ws, source: 'combined-md' } : null;
  } catch {
    return null;
  }
}
