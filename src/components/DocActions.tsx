import { useState } from 'preact/hooks';
import { downloadDocAsMarkdown } from '../core/export';
import { activeDocContent, workspaceSignal } from '../core/state';
import type { ActiveDocId } from '../core/types';

function activeDocFilename(id: ActiveDocId, workspace = workspaceSignal.value): string {
  if (id.kind === 'constitution') return 'constitution.md';
  const feature = workspace.features.find((f) => f.id === id.featureId);
  if (!feature) return `${id.doc}.md`;
  const dir = `${String(feature.number).padStart(3, '0')}-${feature.slug}`;
  return `${dir}-${id.doc}.md`;
}

export function DocActions() {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeDocContent.value);
      setCopyState('ok');
    } catch {
      setCopyState('err');
    }
    setTimeout(() => setCopyState('idle'), 1500);
  }

  function handleDownload() {
    const id = workspaceSignal.value.activeDocId;
    const filename = activeDocFilename(id);
    downloadDocAsMarkdown(filename, activeDocContent.value);
  }

  return (
    <div class="doc-actions" role="toolbar" aria-label="Document actions">
      <button
        type="button"
        class="doc-action"
        onClick={handleCopy}
        aria-live="polite"
        aria-label="Copy markdown to clipboard"
        title="Copy markdown to clipboard"
      >
        {copyState === 'ok' ? 'Copied' : copyState === 'err' ? 'Copy failed' : 'Copy'}
      </button>
      <button
        type="button"
        class="doc-action"
        onClick={handleDownload}
        aria-label="Download this document as a .md file"
        title="Download this document as a .md file"
      >
        Download .md
      </button>
    </div>
  );
}
