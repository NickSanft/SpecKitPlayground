import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings', () => {
    expect(renderMarkdown('# Hello')).toBe('<h1>Hello</h1>\n');
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold** and *italic*')).toContain('<strong>bold</strong>');
    expect(renderMarkdown('**bold** and *italic*')).toContain('<em>italic</em>');
  });

  it('renders fenced code blocks', () => {
    const html = renderMarkdown('```\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code>');
    expect(html).toContain('const x = 1;');
  });

  it('renders unordered lists', () => {
    const html = renderMarkdown('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('escapes raw HTML rather than rendering it (html: false)', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes raw HTML mixed with markdown', () => {
    const html = renderMarkdown('hello <b>world</b>');
    expect(html).not.toMatch(/<b>/);
    expect(html).toContain('&lt;b&gt;');
  });

  it('autolinks bare URLs (linkify enabled)', () => {
    const html = renderMarkdown('see https://example.com here');
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
  });

  it('does not autolink bare email addresses (fuzzyEmail off)', () => {
    const html = renderMarkdown('contact me at foo@bar.com');
    expect(html).not.toContain('mailto:');
  });

  it('does not turn single newlines into <br> (breaks: false)', () => {
    const html = renderMarkdown('line one\nline two');
    expect(html).not.toContain('<br>');
  });

  it('adds target="_blank" and rel="noopener noreferrer" to links', () => {
    const html = renderMarkdown('[text](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('renders blockquotes', () => {
    expect(renderMarkdown('> quoted')).toContain('<blockquote>');
  });

  it('renders inline code', () => {
    expect(renderMarkdown('use `npm install`')).toContain('<code>npm install</code>');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
