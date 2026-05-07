import { EditorView } from '@codemirror/view';
import { useEffect, useRef } from 'preact/hooks';
import { buildEditorState } from '../core/editor-setup';

export interface EditorProps {
  initialDoc: string;
  onChange: (next: string) => void;
}

export function Editor({ initialDoc, onChange }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = buildEditorState({
      initialDoc,
      onChange: (next) => onChangeRef.current(next),
    });
    const view = new EditorView({ state, parent: host });

    return () => {
      view.destroy();
    };
    // Mount once with the seed; switching docs in Phase 2 dispatches a
    // transaction rather than remounting.
  }, []);

  return <div class="editor-host" ref={hostRef} aria-label="Markdown editor" />;
}
