import { effect, signal } from '@preact/signals';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'spk:theme';
const VALID: readonly ThemePreference[] = ['system', 'light', 'dark'];

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (VALID as readonly string[]).includes(raw)) return raw as ThemePreference;
  } catch {
    // localStorage unavailable (private mode, sandboxed iframe, etc.)
  }
  return 'system';
}

function writeStored(value: ThemePreference): void {
  try {
    if (value === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // ignore — preference just won't persist
  }
}

export const themePreference = signal<ThemePreference>(readStored());

export function setThemePreference(next: ThemePreference): void {
  themePreference.value = next;
}

export function cycleTheme(): void {
  const current = themePreference.value;
  const next: ThemePreference =
    current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  setThemePreference(next);
}

let started = false;

export function startThemeEffect(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  effect(() => {
    const value = themePreference.value;
    writeStored(value);
    if (value === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', value);
    }
  });
}
