import { render } from 'preact';
import { App } from './app';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/editor.css';

const root = document.getElementById('app');
if (!root) throw new Error('Mount point #app not found');
render(<App />, root);
