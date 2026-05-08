import { useState } from 'preact/hooks';
import { isPristineWorkspace } from '../core/state';

export function FirstRunBanner({ onAddFeature }: { onAddFeature: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !isPristineWorkspace.value) return null;

  return (
    <aside class="first-run-banner" role="status">
      <div class="first-run-body">
        <strong>This is a fresh workspace.</strong> The constitution below is seeded from the
        official Spec Kit template — edit it to make it yours, or add your first feature to start
        spec'ing.
      </div>
      <div class="first-run-actions">
        <button type="button" class="btn btn-primary" onClick={onAddFeature}>
          Add a feature
        </button>
        <button
          type="button"
          class="first-run-dismiss"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
