import { useMemo, useState } from 'preact/hooks';
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportFormat,
  type ExportOptions,
  type FileTreeNode,
  buildCombinedMarkdown,
  buildExportTree,
  buildFileTreeView,
  buildZip,
  triggerBlobDownload,
  workspaceFilename,
} from '../core/export';
import type { Workspace } from '../core/types';

export interface ExportModalProps {
  workspace: Workspace;
  onClose: () => void;
}

export function ExportModal({ workspace, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('zip');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = useMemo(() => buildExportTree(workspace, options), [workspace, options]);
  const tree = useMemo(() => buildFileTreeView(files), [files]);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      if (format === 'zip') {
        const blob = await buildZip(workspace, options);
        triggerBlobDownload(blob, workspaceFilename(workspace, 'zip'));
      } else {
        const md = buildCombinedMarkdown(workspace, options);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        triggerBlobDownload(blob, workspaceFilename(workspace, 'combined-md'));
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  const downloadLabel = busy ? 'Building…' : format === 'zip' ? 'Download .zip' : 'Download .md';

  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="export-title" class="modal-title">
          Export workspace
        </h2>
        <p class="modal-hint">
          Downloads <code>{workspaceFilename(workspace, format)}</code>.{' '}
          {format === 'zip'
            ? 'Unzip at the root of a project to drop the .specify/ directory in place.'
            : 'A single markdown file with HTML-comment markers; round-trips by drag-and-drop back into this app.'}
        </p>

        <fieldset class="export-options">
          <legend class="export-options-legend">Format</legend>
          <label class="export-option">
            <input
              type="radio"
              name="export-format"
              checked={format === 'zip'}
              onChange={() => setFormat('zip')}
            />
            <span>
              <span class="export-option-name">.specify zip</span>
              <span class="export-option-desc">
                Folder structure that <code>specify init</code> would produce.
              </span>
            </span>
          </label>
          <label class="export-option">
            <input
              type="radio"
              name="export-format"
              checked={format === 'combined-md'}
              onChange={() => setFormat('combined-md')}
            />
            <span>
              <span class="export-option-name">Single combined .md</span>
              <span class="export-option-desc">
                One markdown file. Useful for sharing in chat, gists, or pasting into an LLM.
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset class="export-options">
          <legend class="export-options-legend">Contents</legend>
          <label class="export-option">
            <input
              type="checkbox"
              checked={options.includeTemplates}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  includeTemplates: (e.target as HTMLInputElement).checked,
                }))
              }
              disabled={format !== 'zip'}
            />
            <span>
              <span class="export-option-name">Include templates folder</span>
              <span class="export-option-desc">
                Copies the upstream <code>spec / plan / tasks</code> templates so others can reuse
                them. (Zip only.)
              </span>
            </span>
          </label>

          <label class="export-option">
            <input
              type="checkbox"
              checked={options.includeEmptyFeatures}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  includeEmptyFeatures: (e.target as HTMLInputElement).checked,
                }))
              }
            />
            <span>
              <span class="export-option-name">Include empty features</span>
              <span class="export-option-desc">
                Off by default — features whose spec/plan/tasks are still the unedited templates are
                skipped.
              </span>
            </span>
          </label>
        </fieldset>

        {format === 'zip' && (
          <section class="export-tree" aria-label="File tree preview">
            <header class="export-tree-header">
              <span>{files.length} files</span>
            </header>
            <ul class="export-tree-list">
              {tree.map((node) => (
                <TreeNodeView node={node} depth={0} />
              ))}
            </ul>
          </section>
        )}

        {error && (
          <p class="export-error" role="alert">
            {error}
          </p>
        )}

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" class="btn btn-primary" onClick={handleDownload} disabled={busy}>
            {downloadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TreeNodeView({ node, depth }: { node: FileTreeNode; depth: number }) {
  const indent = { paddingLeft: `${depth * 14}px` };
  return (
    <li class="export-tree-item">
      <span class={`export-tree-name ${node.isDir ? 'is-dir' : 'is-file'}`} style={indent}>
        <span class="export-tree-glyph" aria-hidden="true">
          {node.isDir ? '▸' : '•'}
        </span>
        {node.name}
        {node.isDir ? '/' : ''}
      </span>
      {node.children && (
        <ul class="export-tree-list">
          {node.children.map((c) => (
            <TreeNodeView node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
