import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { deserializeWorkspace, serializeWorkspace } from './storage';
import type { Workspace } from './types';

const FRAGMENT_KEY = 'w';
const ENVELOPE_VERSION = 1;

interface ShareEnvelope {
  v: typeof ENVELOPE_VERSION;
  ws: ReturnType<typeof serializeWorkspace>;
}

/**
 * Encode a workspace into a compressed, URL-safe string ready to drop into
 * a fragment. Returns null if encoding produced an empty string (shouldn't
 * happen for valid workspaces, but we don't want to ship a bad link).
 */
export function encodeWorkspaceToShareToken(ws: Workspace): string | null {
  const envelope: ShareEnvelope = { v: ENVELOPE_VERSION, ws: serializeWorkspace(ws) };
  const json = JSON.stringify(envelope);
  const compressed = compressToEncodedURIComponent(json);
  return compressed.length > 0 ? compressed : null;
}

/**
 * Decode a share token back into a Workspace. Tolerates malformed input,
 * older envelope versions (returns null), and incompatible workspace shapes.
 */
export function decodeShareToken(token: string): Workspace | null {
  if (!token) return null;
  let json: string | null = null;
  try {
    json = decompressFromEncodedURIComponent(token);
  } catch {
    return null;
  }
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const env = parsed as { v?: unknown; ws?: unknown };
  if (env.v !== ENVELOPE_VERSION) return null;
  return deserializeWorkspace(env.ws);
}

export function buildShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? (typeof location !== 'undefined' ? location.href.split('#')[0] : '');
  return `${base ?? ''}#${FRAGMENT_KEY}=${token}`;
}

/**
 * Read the current location's `#w=...` fragment (if any) and return the
 * decoded workspace. Side-effect-free; the caller decides whether to import.
 */
export function readShareFromLocation(): { token: string; workspace: Workspace | null } | null {
  if (typeof location === 'undefined') return null;
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const token = params.get(FRAGMENT_KEY);
  if (!token) return null;
  return { token, workspace: decodeShareToken(token) };
}

/** Strip the `#w=` fragment from the URL without reloading the page. */
export function clearShareFromLocation(): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const cleanUrl = location.href.split('#')[0] ?? location.href;
  history.replaceState(null, '', cleanUrl);
}
