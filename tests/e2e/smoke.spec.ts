import { expect, test } from '@playwright/test';

test('app shell renders at the configured base path', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await expect(
    page.getByRole('heading', { name: 'Spec Kit Playground', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pane-sidebar')).toBeVisible();
  await expect(page.locator('.pane-editor')).toBeVisible();
  await expect(page.locator('.pane-preview')).toBeVisible();
});

test('seeded welcome content is rendered in the preview pane', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  const preview = page.locator('.preview-body');
  await expect(
    preview.getByRole('heading', { name: 'Welcome to Spec Kit Playground' }),
  ).toBeVisible();
});

test('typing in the editor updates the preview', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();

  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('# Live edit smoke\n\n');

  const preview = page.locator('.preview-body');
  await expect(preview.getByRole('heading', { name: 'Live edit smoke' })).toBeVisible({
    timeout: 2000,
  });
});

test('raw HTML pasted into the editor is escaped, not rendered', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('<script>window.__pwned=true</script>');

  await page.waitForTimeout(200);

  const pwned = await page.evaluate(() =>
    Boolean((window as unknown as { __pwned?: boolean }).__pwned),
  );
  expect(pwned).toBe(false);

  const previewHtml = await page.locator('.preview-body').innerHTML();
  expect(previewHtml).not.toContain('<script');
});
