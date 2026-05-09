import { signal } from '@preact/signals';
import { clearShareFromLocation } from '../core/share';
import { commitCreateWorkspaceFromShared } from '../core/state';
import type { Workspace } from '../core/types';

/**
 * The pending shared workspace is held module-level so the banner survives
 * any number of unrelated re-renders without forgetting it.
 */
export const pendingSharedWorkspace = signal<Workspace | null>(null);

export function ImportPreviewBanner() {
  const ws = pendingSharedWorkspace.value;
  if (!ws) return null;

  async function handleImport(replaceActive: boolean) {
    await commitCreateWorkspaceFromShared(ws!, replaceActive);
    pendingSharedWorkspace.value = null;
    clearShareFromLocation();
  }

  function handleDismiss() {
    pendingSharedWorkspace.value = null;
    clearShareFromLocation();
  }

  return (
    <div class="import-banner" role="status">
      <div class="import-banner-body">
        <strong>Shared workspace detected.</strong> &ldquo;{ws.name}&rdquo; with{' '}
        {ws.features.length} feature{ws.features.length === 1 ? '' : 's'}. Importing creates a copy
        in your browser; the link itself isn't kept.
      </div>
      <div class="import-banner-actions">
        <button type="button" class="btn btn-primary" onClick={() => void handleImport(false)}>
          Import as new workspace
        </button>
        <button type="button" class="btn btn-secondary" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
