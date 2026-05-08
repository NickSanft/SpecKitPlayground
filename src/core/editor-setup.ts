import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  HighlightStyle,
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  rectangularSelection,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.6',
    padding: '0',
  },
  '.cm-content': {
    padding: 'var(--space-4)',
    caretColor: 'var(--accent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--accent-soft)',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    display: 'none',
  },
});

const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.25rem', fontWeight: '700', color: 'var(--fg)' },
  { tag: t.heading2, fontSize: '1.125rem', fontWeight: '700', color: 'var(--fg)' },
  { tag: t.heading3, fontSize: '1rem', fontWeight: '700', color: 'var(--fg)' },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '700', color: 'var(--fg)' },
  { tag: t.strong, fontWeight: '700', color: 'var(--fg)' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--accent)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' },
  { tag: t.quote, color: 'var(--fg-muted)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--fg)' },
  { tag: t.meta, color: 'var(--fg-subtle)' },
  { tag: t.processingInstruction, color: 'var(--fg-subtle)' },
  { tag: t.contentSeparator, color: 'var(--fg-subtle)' },
]);

export interface EditorSetupOptions {
  initialDoc: string;
  onChange: (next: string) => void;
}

export function buildEditorState({ initialDoc, onChange }: EditorSetupOptions): EditorState {
  const extensions: Extension[] = [
    history(),
    drawSelection(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    bracketMatching(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    markdown(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    syntaxHighlighting(markdownHighlight),
    editorTheme,
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor' }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
  ];
  return EditorState.create({ doc: initialDoc, extensions });
}
