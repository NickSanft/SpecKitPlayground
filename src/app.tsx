import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import welcomeMarkdown from './content/welcome.md?raw';
import { debounce } from './utils/debounce';

const previewDoc = signal<string>(welcomeMarkdown);

const flushPreview = debounce((next: string) => {
  previewDoc.value = next;
}, 100);

export function App() {
  useEffect(() => {
    return () => flushPreview.cancel();
  }, []);

  return (
    <div class="app-shell">
      <header class="app-header">
        <h1 class="app-title">Spec Kit Playground</h1>
        <span class="app-tagline">Phase 1 · single-doc editor + live preview</span>
      </header>
      <main class="app-main">
        <aside class="pane pane-sidebar" aria-label="Document tree">
          <p class="placeholder">Sidebar lands in Phase 2.</p>
        </aside>
        <section class="pane pane-editor">
          <Editor initialDoc={welcomeMarkdown} onChange={flushPreview} />
        </section>
        <section class="pane pane-preview">
          <Preview source={previewDoc.value} />
        </section>
      </main>
    </div>
  );
}
