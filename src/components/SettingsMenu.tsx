import { useEffect, useRef, useState } from 'preact/hooks';
import { commitResetWorkspace } from '../core/state';

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

  async function handleReset() {
    if (
      !window.confirm(
        'Reset workspace? This deletes the saved data in your browser and seeds a fresh constitution. This cannot be undone.',
      )
    ) {
      setOpen(false);
      return;
    }
    await commitResetWorkspace();
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
              onClick={handleReset}
            >
              Reset workspace…
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
