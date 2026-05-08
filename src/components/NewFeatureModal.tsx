import { useEffect, useRef, useState } from 'preact/hooks';
import { slugify } from '../utils/slug';

export interface NewFeatureModalProps {
  onClose: () => void;
  onCreate: (title: string) => void;
}

export function NewFeatureModal({ onClose, onCreate }: NewFeatureModalProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const trimmed = title.trim();
  const previewSlug = trimmed.length > 0 ? slugify(trimmed) : '';

  function submit(e: Event) {
    e.preventDefault();
    if (trimmed.length === 0) return;
    onCreate(trimmed);
    onClose();
  }

  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-feature-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-feature-title" class="modal-title">
          New feature
        </h2>
        <form class="modal-form" onSubmit={submit}>
          <label class="modal-field">
            <span class="modal-field-label">Title</span>
            <input
              ref={inputRef}
              class="modal-input"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
              placeholder="User Authentication"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                }
              }}
            />
          </label>
          {previewSlug && (
            <p class="modal-hint">
              Will be saved as <code>{previewSlug}</code>
            </p>
          )}
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={trimmed.length === 0}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
