import { useState } from 'preact/hooks';
import { DocActions } from './components/DocActions';
import { Editor } from './components/Editor';
import { ExportModal } from './components/ExportModal';
import { FirstRunBanner } from './components/FirstRunBanner';
import { NewFeatureModal } from './components/NewFeatureModal';
import { Preview } from './components/Preview';
import { SaveStatus } from './components/SaveStatus';
import { SettingsMenu } from './components/SettingsMenu';
import { Sidebar } from './components/Sidebar';
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

  const workspace = workspaceSignal.value;
  const docKey = activeDocKey(workspace.activeDocId);
  const openNewFeature = () => setNewFeatureOpen(true);

  return (
    <div class="app-shell">
      <header class="app-header">
        <h1 class="app-title">Spec Kit Playground</h1>
        <span class="app-doc-label" aria-live="polite">
          {activeDocLabel.value}
        </span>
        <SaveStatus />
        <button
          type="button"
          class="btn btn-secondary header-export"
          onClick={() => setExportOpen(true)}
          aria-label="Export workspace"
        >
          Export
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
      {newFeatureOpen && (
        <NewFeatureModal
          onClose={() => setNewFeatureOpen(false)}
          onCreate={(title) => commitAddFeature(title)}
        />
      )}
      {exportOpen && <ExportModal workspace={workspace} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
