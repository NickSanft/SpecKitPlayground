import { render } from 'preact';
import { App } from './app';
import { pendingSharedWorkspace } from './components/ImportPreviewBanner';
import { readShareFromLocation } from './core/share';
import { hydrateAndStartAutoSave } from './core/state';
import { startThemeEffect } from './core/theme';
import { startNowTick } from './core/tick';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/editor.css';
import './styles/print.css';

const root = document.getElementById('app');
if (!root) throw new Error('Mount point #app not found');

startThemeEffect();
startNowTick();

const shared = readShareFromLocation();
if (shared?.workspace) {
  pendingSharedWorkspace.value = { workspace: shared.workspace, source: 'url' };
}

void hydrateAndStartAutoSave().finally(() => {
  render(<App />, root);
});
