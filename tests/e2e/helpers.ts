import { type Page } from '@playwright/test';

/**
 * Returns the platform-correct select-all modifier for the *emulated browser*,
 * which matters because CodeMirror reads `navigator.platform`. WebKit running
 * on Windows still reports a Mac platform, so Ctrl+A doesn't fire selectAll.
 */
async function selectAllModifier(page: Page): Promise<'Meta' | 'Control'> {
  const isMacLike = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  return isMacLike ? 'Meta' : 'Control';
}

export async function replaceEditorContent(page: Page, next: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await editor.click();
  const mod = await selectAllModifier(page);
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press('Delete');
  await page.keyboard.type(next);
}
