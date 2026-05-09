import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildShareUrl, encodeWorkspaceToShareToken } from '../core/share';
import type { Workspace } from '../core/types';

export interface ShareModalProps {
  workspace: Workspace;
  onClose: () => void;
}

export function ShareModal({ workspace, onClose }: ShareModalProps) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  const url = useMemo(() => {
    const token = encodeWorkspaceToShareToken(workspace);
    if (!token) return null;
    return buildShareUrl(token);
  }, [workspace]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.select());
  }, []);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('ok');
    } catch {
      setCopyState('err');
    }
    setTimeout(() => setCopyState('idle'), 1500);
  }

  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-title" class="modal-title">
          Share this workspace
        </h2>

        {url ? (
          <>
            <p class="modal-hint">
              The full workspace is encoded in the URL below. Anyone with the link can decode it and
              import it into their own browser.
            </p>

            <div class="share-url-row">
              <input
                ref={inputRef}
                class="modal-input share-url-input"
                value={url}
                readonly
                aria-label="Shareable URL"
              />
              <button type="button" class="btn btn-primary" onClick={() => void copy()}>
                {copyState === 'ok' ? 'Copied' : copyState === 'err' ? 'Copy failed' : 'Copy link'}
              </button>
            </div>

            <p class="share-warning" role="status">
              <strong>Heads up:</strong> the link contains your entire workspace text. Browser
              history, server logs, and chat archives that store URLs will see this content. Don't
              share links you wouldn't paste publicly.
            </p>

            <p class="modal-hint share-stats">
              Token length: {url.length.toLocaleString()} characters. Most browsers and chat apps
              accept URLs up to ~8&nbsp;000 characters; longer workspaces may not paste cleanly.
            </p>
          </>
        ) : (
          <p class="export-error" role="alert">
            Couldn't encode this workspace for sharing.
          </p>
        )}

        <div class="modal-actions">
          <button type="button" class="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
