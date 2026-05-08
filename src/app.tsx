import { useEffect, useState } from 'preact/hooks';
import { DocActions } from './components/DocActions';
import { Editor } from './components/Editor';
import { ExportModal } from './components/ExportModal';
import { FirstRunBanner } from './components/FirstRunBanner';
import { HelpModal } from './components/HelpModal';
import { LintButton } from './components/LintButton';
import { LintPanel } from './components/LintPanel';
import { MobileTabBar } from './components/MobileTabBar';
import { NewFeatureModal } from './components/NewFeatureModal';
import { Preview } from './components/Preview';
import { SaveStatus } from './components/SaveStatus';
import { SettingsMenu } from './components/SettingsMenu';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import {
  mobilePane,
  previewVisible,
  sidebarVisible,
  togglePreview,
  toggleSidebar,
} from './core/layout';
import { registerShortcuts, type ShortcutBinding } from './core/shortcuts';
import {
  activeDocContent,
  activeDocLabel,
  commitAddFeature,
  commitUpdateActiveDocContent,
  workspaceSignal,
} from './core/state';
import type { ActiveDocId } from './core/types';

function activeDocKey(id: ActiveDocId): string {
  return id.kind === 'constitution' ? 'constitution' : `${id.featureId}:${id.doc}`;
}

export function App() {
  const [newFeatureOpen, setNewFeatureOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lintOpen, setLintOpen] = useState(false);

  const workspace = workspaceSignal.value;
  const docKey = activeDocKey(workspace.activeDocId);
  const openNewFeature = () => setNewFeatureOpen(true);
  const openExport = () => setExportOpen(true);
  const openHelp = () => setHelpOpen(true);
  const openLint = () => setLintOpen(true);

  const shortcuts: ShortcutBinding[] = [
    {
      match: { key: 'e', cmdOrCtrl: true },
      description: 'Export workspace',
      run: openExport,
    },
    {
      match: { key: 'b', cmdOrCtrl: true },
      description: 'Toggle sidebar',
      run: toggleSidebar,
    },
    {
      match: { key: 'p', cmdOrCtrl: true },
      description: 'Toggle preview',
      run: togglePreview,
    },
    {
      match: { key: 'n', cmdOrCtrl: true },
      description: 'New feature',
      run: openNewFeature,
    },
    {
      match: { key: '/', cmdOrCtrl: true },
      description: 'Show this help',
      run: openHelp,
    },
    {
      match: { key: 'l', cmdOrCtrl: true, shift: true },
      description: 'Open lint panel',
      run: openLint,
    },
  ];

  useEffect(() => {
    return registerShortcuts(shortcuts);
  }, []);

  const showSidebar = sidebarVisible.value;
  const showPreview = previewVisible.value;
  const mobile = mobilePane.value;

  return (
    <div
      class="app-shell"
      data-mobile-pane={mobile}
      data-sidebar={showSidebar ? 'open' : 'closed'}
      data-preview={showPreview ? 'open' : 'closed'}
    >
      <header class="app-header">
        <h1 class="app-title">Spec Kit Playground</h1>
        <span class="app-doc-label" aria-live="polite">
          {activeDocLabel.value}
        </span>
        <SaveStatus />
        <LintButton onOpen={openLint} />
        <button
          type="button"
          class="btn btn-secondary header-export"
          onClick={openExport}
          aria-label="Export workspace"
        >
          Export
        </button>
        <ThemeToggle />
        <button
          type="button"
          class="theme-toggle"
          onClick={openHelp}
          aria-label="Show help"
          title="Help"
        >
          <span aria-hidden="true">?</span>
        </button>
        <SettingsMenu />
      </header>
      <main class="app-main">
        <Sidebar onAddFeature={openNewFeature} />
        <section class="pane pane-editor">
          <FirstRunBanner onAddFeature={openNewFeature} />
          <DocActions />
          <Editor
            key={docKey}
            initialDoc={activeDocContent.value}
            onChange={commitUpdateActiveDocContent}
          />
        </section>
        <section class="pane pane-preview">
          <Preview source={activeDocContent.value} />
        </section>
      </main>
      <MobileTabBar />
      {newFeatureOpen && (
        <NewFeatureModal
          onClose={() => setNewFeatureOpen(false)}
          onCreate={(title) => commitAddFeature(title)}
        />
      )}
      {exportOpen && <ExportModal workspace={workspace} onClose={() => setExportOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />}
      {lintOpen && <LintPanel onClose={() => setLintOpen(false)} />}
    </div>
  );
}
