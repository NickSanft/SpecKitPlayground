export interface ShortcutMatch {
  key: string;
  cmdOrCtrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

function matches(event: KeyboardEvent, m: ShortcutMatch): boolean {
  if (event.key.toLowerCase() !== m.key.toLowerCase()) return false;
  const wantCmd = m.cmdOrCtrl ?? false;
  const hasCmd = event.metaKey || event.ctrlKey;
  if (wantCmd !== hasCmd) return false;
  const wantShift = m.shift ?? false;
  if (wantShift !== event.shiftKey) return false;
  const wantAlt = m.alt ?? false;
  if (wantAlt !== event.altKey) return false;
  return true;
}

export interface ShortcutBinding {
  match: ShortcutMatch;
  description: string;
  run: () => void;
  /**
   * If true, the shortcut also fires when an editable element (textarea, input, contenteditable)
   * is focused. Default: false — typing in CodeMirror or a modal input must not trigger app
   * shortcuts.
   */
  whenEditing?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function registerShortcuts(bindings: readonly ShortcutBinding[]): () => void {
  function handler(event: KeyboardEvent): void {
    const editing = isEditableTarget(event.target);
    for (const binding of bindings) {
      if (editing && !binding.whenEditing) continue;
      if (matches(event, binding.match)) {
        event.preventDefault();
        binding.run();
        return;
      }
    }
  }
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

export function formatShortcut(m: ShortcutMatch): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const parts: string[] = [];
  if (m.cmdOrCtrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (m.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (m.alt) parts.push(isMac ? '⌥' : 'Alt');
  parts.push(m.key.length === 1 ? m.key.toUpperCase() : m.key);
  return parts.join(isMac ? '' : '+');
}
