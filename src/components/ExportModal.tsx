import { useMemo, useState } from 'preact/hooks';
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions,
  type FileTreeNode,
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
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = useMemo(() => buildExportTree(workspace, options), [workspace, options]);
  const tree = useMemo(() => buildFileTreeView(files), [files]);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const blob = await buildZip(workspace, options);
      triggerBlobDownload(blob, workspaceFilename(workspace));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

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
          Downloads <code>{workspaceFilename(workspace)}</code>. Unzip at the root of a project to
          drop the <code>.specify/</code> directory in place.
        </p>

        <fieldset class="export-options">
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
            />
            <span>
              <span class="export-option-name">Include templates folder</span>
              <span class="export-option-desc">
                Copies the upstream <code>spec / plan / tasks</code> templates so others can reuse
                them.
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
            {busy ? 'Building…' : 'Download .zip'}
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
