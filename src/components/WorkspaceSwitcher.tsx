import { useEffect, useRef, useState } from 'preact/hooks';
import {
  commitCreateWorkspace,
  commitDeleteWorkspace,
  commitRenameActiveWorkspace,
  commitSwitchWorkspace,
  workspaceList,
  workspaceSignal,
} from '../core/state';

export function WorkspaceSwitcher() {
  const active = workspaceSignal.value;
  const list = workspaceList.value;

  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(active.name);

  const rootRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;
    // Focus + select happens on the next paint so the input has actually mounted.
    const id = requestAnimationFrame(() => renameInputRef.current?.select());
    return () => cancelAnimationFrame(id);
  }, [renaming]);

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

  function commitRename() {
    setRenaming(false);
    if (draftName.trim() && draftName.trim() !== active.name) {
      commitRenameActiveWorkspace(draftName);
    } else {
      setDraftName(active.name);
    }
  }

  async function handleCreate() {
    setOpen(false);
    const name = window.prompt('Name for the new workspace?', 'New Workspace');
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    await commitCreateWorkspace(trimmed);
  }

  async function handleSwitch(id: string) {
    setOpen(false);
    await commitSwitchWorkspace(id);
  }

  async function handleDelete() {
    setOpen(false);
    if (
      !window.confirm(
        `Delete workspace "${active.name}"? This permanently removes its constitution and features.`,
      )
    ) {
      return;
    }
    await commitDeleteWorkspace(active.id);
  }

  return (
    <div class="workspace-switcher" ref={rootRef}>
      {renaming ? (
        <input
          ref={renameInputRef}
          class="workspace-rename-input"
          value={draftName}
          onInput={(e) => setDraftName((e.target as HTMLInputElement).value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setRenaming(false);
              setDraftName(active.name);
            }
          }}
          aria-label="Rename workspace"
        />
      ) : (
        <button
          type="button"
          class="workspace-name"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : 'false'}
          aria-label={`Active workspace: ${active.name}. Click to switch or rename.`}
          onDblClick={() => setRenaming(true)}
        >
          <span class="workspace-name-text">{active.name}</span>
          <span class="workspace-name-caret" aria-hidden="true">
            ▾
          </span>
        </button>
      )}

      {open && (
        <ul class="workspace-popover" role="menu" aria-label="Workspaces">
          {list.length > 1 && (
            <li class="workspace-popover-section" aria-label="Switch to">
              <span class="workspace-popover-label">Switch to</span>
              <ul role="group">
                {list
                  .filter((m) => m.id !== active.id)
                  .map((m) => (
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        class="workspace-popover-item"
                        onClick={() => void handleSwitch(m.id)}
                      >
                        {m.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </li>
          )}
          <li>
            <button
              type="button"
              role="menuitem"
              class="workspace-popover-item"
              onClick={() => {
                setOpen(false);
                setRenaming(true);
              }}
            >
              Rename this workspace…
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              class="workspace-popover-item"
              onClick={() => void handleCreate()}
            >
              + New workspace…
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              class="workspace-popover-item workspace-popover-item-danger"
              onClick={() => void handleDelete()}
            >
              Delete this workspace…
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
