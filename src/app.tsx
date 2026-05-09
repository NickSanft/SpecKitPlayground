import { useEffect, useState } from 'preact/hooks';
import { DiffView } from './components/DiffView';
import { DocActions, editorMode } from './components/DocActions';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { ExportModal } from './components/ExportModal';
import { FirstRunBanner } from './components/FirstRunBanner';
import { HelpModal } from './components/HelpModal';
import { ImportPreviewBanner } from './components/ImportPreviewBanner';
import { LintButton } from './components/LintButton';
import { LintPanel } from './components/LintPanel';
import { MobileTabBar } from './components/MobileTabBar';
import { NewFeatureModal } from './components/NewFeatureModal';
import { Preview } from './components/Preview';
import { SaveStatus } from './components/SaveStatus';
import { SettingsMenu } from './components/SettingsMenu';
import { ShareModal } from './components/ShareModal';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
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
  changedDocCount,
  commitAddFeature,
  commitUpdateActiveDocContent,
  lastSavedAt,
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
  const [shareOpen, setShareOpen] = useState(false);

  const workspace = workspaceSignal.value;
  const docKey = activeDocKey(workspace.activeDocId);
  const openNewFeature = () => setNewFeatureOpen(true);
  const openExport = () => setExportOpen(true);
  const openHelp = () => setHelpOpen(true);
  const openLint = () => setLintOpen(true);
  const openShare = () => setShareOpen(true);

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
    {
      match: { key: 's', cmdOrCtrl: true, shift: true },
      description: 'Share workspace as link',
      run: openShare,
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
      data-saved-at={lastSavedAt.value ?? ''}
      data-active-workspace={workspace.id}
    >
      <header class="app-header">
        <h1 class="app-title">Spec Kit Playground</h1>
        <WorkspaceSwitcher />
        <span class="app-doc-label" aria-live="polite">
          {activeDocLabel.value}
        </span>
        {changedDocCount.value > 0 && (
          <span
            class="changed-pip"
            title={`${changedDocCount.value} doc${changedDocCount.value === 1 ? '' : 's'} changed since baseline`}
            aria-label={`${changedDocCount.value} docs changed since baseline`}
          >
            {changedDocCount.value} changed
          </span>
        )}
        <SaveStatus />
        <LintButton onOpen={openLint} />
        <button
          type="button"
          class="btn btn-secondary header-export"
          onClick={openShare}
          aria-label="Share workspace as link"
        >
          Share
        </button>
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
      <ImportPreviewBanner />
      <DropZone />
      <main class="app-main">
        <Sidebar onAddFeature={openNewFeature} />
        <section class="pane pane-editor">
          <FirstRunBanner onAddFeature={openNewFeature} />
          <DocActions />
          {editorMode.value === 'diff' ? (
            <DiffView />
          ) : (
            <Editor
              key={docKey}
              initialDoc={activeDocContent.value}
              onChange={commitUpdateActiveDocContent}
            />
          )}
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
      {shareOpen && <ShareModal workspace={workspace} onClose={() => setShareOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />}
      {lintOpen && <LintPanel onClose={() => setLintOpen(false)} />}
    </div>
  );
}
