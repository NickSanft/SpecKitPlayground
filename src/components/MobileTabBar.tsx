import { mobilePane, setMobilePane, type MobilePane } from '../core/layout';

const PANES: ReadonlyArray<{ id: MobilePane; label: string }> = [
  { id: 'tree', label: 'Tree' },
  { id: 'editor', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
];

export function MobileTabBar() {
  const active = mobilePane.value;
  return (
    <nav class="mobile-tabs" aria-label="Pane switcher">
      {PANES.map((p) => (
        <button
          type="button"
          class={`mobile-tab ${active === p.id ? 'is-active' : ''}`}
          onClick={() => setMobilePane(p.id)}
          aria-pressed={active === p.id ? 'true' : 'false'}
        >
          {p.label}
        </button>
      ))}
    </nav>
  );
}
