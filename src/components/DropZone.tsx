import { useEffect, useState } from 'preact/hooks';
import { importFromFile } from '../core/import';
import { pendingSharedWorkspace } from './ImportPreviewBanner';

/**
 * Full-app drag-and-drop overlay. Listens on the document for dragover/drop
 * so the user can drop a `.specify` zip or combined `.md` file anywhere on
 * the page. The overlay is purely visual; the parsing happens in import.ts
 * and the result is staged in `pendingSharedWorkspace` so the same banner
 * the URL-share path uses handles the user confirmation.
 */
export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let counter = 0;

    function hasFiles(e: DragEvent): boolean {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i += 1) {
        if (types[i] === 'Files') return true;
      }
      return false;
    }

    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      counter += 1;
      setIsDragging(true);
    }
    function onDragLeave() {
      counter -= 1;
      if (counter <= 0) {
        counter = 0;
        setIsDragging(false);
      }
    }
    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
    }
    async function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = 0;
      setIsDragging(false);
      setError(null);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        const result = await importFromFile(file);
        if (!result) {
          setError(`Couldn't parse "${file.name}" as a Spec Kit zip or combined markdown.`);
          return;
        }
        pendingSharedWorkspace.value = {
          workspace: result.workspace,
          source: result.source,
        };
      } catch (err: unknown) {
        setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <>
      {isDragging && (
        <div class="drop-overlay" role="status" aria-live="polite">
          <div class="drop-overlay-card">
            <p class="drop-overlay-title">Drop to import</p>
            <p class="drop-overlay-hint">
              Accepts a Spec Kit <code>.zip</code> or a combined <code>.md</code> exported from this
              app.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div class="drop-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
