import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

md.linkify.set({ fuzzyEmail: false });

const defaultRender =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token) {
    const aIndex = token.attrIndex('target');
    if (aIndex < 0) {
      token.attrPush(['target', '_blank']);
      token.attrPush(['rel', 'noopener noreferrer']);
    } else {
      token.attrs?.[aIndex]?.splice(1, 1, '_blank');
    }
  }
  return defaultRender(tokens, idx, options, env, self);
};

export function renderMarkdown(input: string): string {
  return md.render(input);
}
