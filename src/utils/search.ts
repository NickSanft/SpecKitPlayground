import type { ActiveDocId, Workspace } from '../core/types';

export interface SearchSnippet {
  /** Text before the match on the same line. */
  before: string;
  /** Exact substring that matched (preserves the original casing from the source). */
  match: string;
  /** Text after the match on the same line. */
  after: string;
}

export interface SearchResult {
  /** Doc to navigate to when the user clicks the result. */
  target: ActiveDocId;
  /** Human label for the doc, e.g. "constitution.md" or "spec.md — User Auth". */
  targetLabel: string;
  /** 1-based line number of the match within the doc. */
  line: number;
  /** Snippet around the match for visual context. */
  snippet: SearchSnippet;
}

const MAX_RESULTS = 100;
const SNIPPET_CONTEXT_CHARS = 60;

interface DocSource {
  target: ActiveDocId;
  targetLabel: string;
  content: string;
}

function collectDocs(workspace: Workspace): DocSource[] {
  const out: DocSource[] = [
    {
      target: { kind: 'constitution' },
      targetLabel: 'constitution.md',
      content: workspace.constitution.content,
    },
  ];
  for (const feature of workspace.features) {
    for (const doc of ['spec', 'plan', 'tasks'] as const) {
      out.push({
        target: { kind: 'feature', featureId: feature.id, doc },
        targetLabel: `${doc}.md — ${feature.title}`,
        content: feature[doc].content,
      });
    }
  }
  return out;
}

function makeSnippet(line: string, matchStart: number, matchLen: number): SearchSnippet {
  const beforeStart = Math.max(0, matchStart - SNIPPET_CONTEXT_CHARS);
  const afterEnd = Math.min(line.length, matchStart + matchLen + SNIPPET_CONTEXT_CHARS);
  const beforeRaw = line.slice(beforeStart, matchStart);
  const afterRaw = line.slice(matchStart + matchLen, afterEnd);
  return {
    before: beforeStart > 0 ? `…${beforeRaw}` : beforeRaw,
    match: line.slice(matchStart, matchStart + matchLen),
    after: afterEnd < line.length ? `${afterRaw}…` : afterRaw,
  };
}

/**
 * Case-insensitive substring search across every doc in the workspace.
 * Returns at most one result per match, capped at 100 to keep degenerate
 * queries (like a single space) from flooding the panel.
 *
 * Design choice: substring rather than regex. Faster to type, less surprise
 * for non-developer users; can be reconsidered if regex is requested.
 */
export function searchWorkspace(workspace: Workspace, query: string): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const lowered = trimmed.toLowerCase();
  const results: SearchResult[] = [];

  outer: for (const source of collectDocs(workspace)) {
    const lines = source.content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      const lineLower = line.toLowerCase();
      let from = 0;
      while (from <= lineLower.length) {
        const idx = lineLower.indexOf(lowered, from);
        if (idx === -1) break;
        results.push({
          target: source.target,
          targetLabel: source.targetLabel,
          line: i + 1,
          snippet: makeSnippet(line, idx, trimmed.length),
        });
        if (results.length >= MAX_RESULTS) break outer;
        from = idx + Math.max(trimmed.length, 1);
      }
    }
  }

  return results;
}

export const SEARCH_RESULT_CAP = MAX_RESULTS;
