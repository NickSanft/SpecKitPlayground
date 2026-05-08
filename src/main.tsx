import { render } from 'preact';
import { App } from './app';
import { hydrateAndStartAutoSave } from './core/state';
import { startThemeEffect } from './core/theme';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/editor.css';

const root = document.getElementById('app');
if (!root) throw new Error('Mount point #app not found');

startThemeEffect();

void hydrateAndStartAutoSave().finally(() => {
  render(<App />, root);
});
