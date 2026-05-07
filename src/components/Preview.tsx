import { useMemo } from 'preact/hooks';
import { renderMarkdown } from '../utils/markdown';

export interface PreviewProps {
  source: string;
}

export function Preview({ source }: PreviewProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <article
      class="preview-body"
      aria-label="Markdown preview"
      // markdown-it is configured with html: false, so user input cannot
      // produce raw HTML; only the renderer's tags reach the DOM.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
