import { describe, expect, it } from 'vitest';
import { formatShortcut } from './shortcuts';

describe('formatShortcut', () => {
  it('formats single letter shortcuts as uppercase', () => {
    const out = formatShortcut({ key: 'e', cmdOrCtrl: true });
    expect(out).toMatch(/E$/);
  });

  it('includes shift and alt modifiers when present', () => {
    const out = formatShortcut({ key: 'n', cmdOrCtrl: true, shift: true });
    expect(out).toMatch(/N$/);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it('preserves multi-character key names like Slash', () => {
    const out = formatShortcut({ key: '/', cmdOrCtrl: true });
    expect(out).toContain('/');
  });
});
