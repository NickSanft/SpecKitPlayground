import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { downloadDocAsMarkdown } from '../core/export';
import {
  activeDocBaseline,
  activeDocContent,
  commitMarkActiveDocAsBaseline,
  workspaceSignal,
} from '../core/state';
import type { ActiveDocId } from '../core/types';

function activeDocFilename(id: ActiveDocId, workspace = workspaceSignal.value): string {
  if (id.kind === 'constitution') return 'constitution.md';
  const feature = workspace.features.find((f) => f.id === id.featureId);
  if (!feature) return `${id.doc}.md`;
  const dir = `${String(feature.number).padStart(3, '0')}-${feature.slug}`;
  return `${dir}-${id.doc}.md`;
}

/** Editor pane mode — module-level so the diff toggle survives doc switches. */
export type EditorMode = 'edit' | 'diff';
export const editorMode = signal<EditorMode>('edit');

export function setEditorMode(mode: EditorMode): void {
  editorMode.value = mode;
}

export function DocActions() {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');
  const mode = editorMode.value;
  const activeHasDiff = activeDocBaseline.value !== activeDocContent.value;

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

  function handleToggleDiff() {
    setEditorMode(mode === 'diff' ? 'edit' : 'diff');
  }

  function handleMarkBaseline() {
    commitMarkActiveDocAsBaseline();
  }

  return (
    <div class="doc-actions" role="toolbar" aria-label="Document actions">
      <button
        type="button"
        class={`doc-action ${mode === 'diff' ? 'is-active' : ''}`}
        onClick={handleToggleDiff}
        aria-pressed={mode === 'diff' ? 'true' : 'false'}
        aria-label={mode === 'diff' ? 'Switch to edit view' : 'View diff against baseline'}
        title={mode === 'diff' ? 'Switch to edit view' : 'View diff against baseline'}
      >
        {mode === 'diff' ? 'Editing view' : 'Diff'}
      </button>
      <button
        type="button"
        class="doc-action"
        onClick={handleMarkBaseline}
        disabled={!activeHasDiff}
        aria-label="Mark current content as baseline"
        title="Mark current content as the diff baseline"
      >
        Mark baseline
      </button>
      <span class="doc-actions-spacer" aria-hidden="true" />
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
        aria-label="Download .md — saves the active document as a markdown file"
        title="Download this document as a .md file"
      >
        Download .md
      </button>
    </div>
  );
}
