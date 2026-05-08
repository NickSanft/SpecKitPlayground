import { cycleTheme, themePreference, type ThemePreference } from '../core/theme';

const LABELS: Record<ThemePreference, { glyph: string; aria: string }> = {
  system: { glyph: '⊙', aria: 'Theme: follow system. Click to switch to light.' },
  light: { glyph: '☀', aria: 'Theme: light. Click to switch to dark.' },
  dark: { glyph: '☾', aria: 'Theme: dark. Click to switch to system.' },
};

export function ThemeToggle() {
  const pref = themePreference.value;
  const meta = LABELS[pref];
  return (
    <button
      type="button"
      class="theme-toggle"
      onClick={cycleTheme}
      aria-label={meta.aria}
      title={meta.aria}
    >
      <span aria-hidden="true">{meta.glyph}</span>
    </button>
  );
}
