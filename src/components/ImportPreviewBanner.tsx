import { signal } from '@preact/signals';
import { clearShareFromLocation } from '../core/share';
import { commitCreateWorkspaceFromShared } from '../core/state';
import type { Workspace } from '../core/types';

export type ImportSource = 'url' | 'zip' | 'combined-md';

export interface PendingImport {
  workspace: Workspace;
  source: ImportSource;
}

/**
 * The pending shared/imported workspace is held module-level so the banner
 * survives any number of unrelated re-renders without forgetting it.
 */
export const pendingSharedWorkspace = signal<PendingImport | null>(null);

const SOURCE_INTRO: Record<ImportSource, string> = {
  url: 'Shared workspace detected.',
  zip: 'Imported zip detected.',
  'combined-md': 'Imported combined markdown detected.',
};

export function ImportPreviewBanner() {
  const pending = pendingSharedWorkspace.value;
  if (!pending) return null;
  const { workspace: ws, source } = pending;

  async function handleImport() {
    await commitCreateWorkspaceFromShared(ws, false);
    pendingSharedWorkspace.value = null;
    if (source === 'url') clearShareFromLocation();
  }

  function handleDismiss() {
    pendingSharedWorkspace.value = null;
    if (source === 'url') clearShareFromLocation();
  }

  return (
    <div class="import-banner" role="status">
      <div class="import-banner-body">
        <strong>{SOURCE_INTRO[source]}</strong> &ldquo;{ws.name}&rdquo; with {ws.features.length}{' '}
        feature{ws.features.length === 1 ? '' : 's'}. Importing creates a copy in your browser
        {source === 'url' ? '; the link itself isn’t kept' : ''}.
      </div>
      <div class="import-banner-actions">
        <button type="button" class="btn btn-primary" onClick={() => void handleImport()}>
          Import as new workspace
        </button>
        <button type="button" class="btn btn-secondary" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
