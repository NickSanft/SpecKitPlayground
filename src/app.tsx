import { useState } from 'preact/hooks';
import { Editor } from './components/Editor';
import { NewFeatureModal } from './components/NewFeatureModal';
import { Preview } from './components/Preview';
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
  const [modalOpen, setModalOpen] = useState(false);

  const workspace = workspaceSignal.value;
  const docKey = activeDocKey(workspace.activeDocId);

  return (
    <div class="app-shell">
      <header class="app-header">
        <h1 class="app-title">Spec Kit Playground</h1>
        <span class="app-tagline">Phase 2 · domain + sidebar nav</span>
        <span class="app-doc-label" aria-live="polite">
          {activeDocLabel.value}
        </span>
      </header>
      <main class="app-main">
        <Sidebar onAddFeature={() => setModalOpen(true)} />
        <section class="pane pane-editor">
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
      {modalOpen && (
        <NewFeatureModal
          onClose={() => setModalOpen(false)}
          onCreate={(title) => commitAddFeature(title)}
        />
      )}
    </div>
  );
}
