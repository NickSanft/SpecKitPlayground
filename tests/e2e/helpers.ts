import { type Page, expect } from '@playwright/test';

/**
 * Returns the platform-correct select-all modifier for the *emulated browser*,
 * which matters because CodeMirror reads `navigator.platform`. WebKit running
 * on Windows still reports a Mac platform, so Ctrl+A doesn't fire selectAll.
 */
async function selectAllModifier(page: Page): Promise<'Meta' | 'Control'> {
  const isMacLike = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  return isMacLike ? 'Meta' : 'Control';
}

async function readSavedAt(page: Page): Promise<string> {
  return (await page.locator('.app-shell').getAttribute('data-saved-at')) ?? '';
}

/**
 * Replaces the editor content and waits for the auto-save to commit.
 * Observes `data-saved-at` on the app shell, which the SaveStatus signal
 * updates on every successful write.
 */
export async function replaceEditorContent(page: Page, next: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await editor.click();
  const before = await readSavedAt(page);
  const mod = await selectAllModifier(page);
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press('Delete');
  await page.keyboard.type(next);
  await waitForSaveAfter(page, before);
}

/**
 * Wait until the auto-save observed by `data-saved-at` advances past `before`.
 * Use this after any state mutation that triggers a write you care about.
 */
export async function waitForSaveAfter(page: Page, before: string): Promise<void> {
  await expect.poll(async () => readSavedAt(page), { timeout: 3000 }).not.toBe(before);
}

/** Convenience: snapshot the saved-at attribute so callers can wait on it later. */
export async function snapshotSavedAt(page: Page): Promise<string> {
  return readSavedAt(page);
}
