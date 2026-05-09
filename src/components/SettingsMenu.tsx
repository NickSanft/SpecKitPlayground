import { useEffect, useRef, useState } from 'preact/hooks';
import { commitResetAllWorkspaces } from '../core/state';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleResetAll() {
    if (
      !window.confirm(
        'Delete ALL workspaces? This wipes every workspace stored in your browser and seeds a single fresh one. This cannot be undone.',
      )
    ) {
      setOpen(false);
      return;
    }
    await commitResetAllWorkspaces();
    setOpen(false);
  }

  return (
    <div class="settings-menu" ref={rootRef}>
      <button
        type="button"
        class="settings-toggle"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <ul class="settings-popover" role="menu">
          <li>
            <button
              type="button"
              role="menuitem"
              class="settings-item settings-item-danger"
              onClick={handleResetAll}
            >
              Delete all workspaces…
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
