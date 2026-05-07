import { expect, test } from '@playwright/test';

test('app shell renders at the configured base path', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await expect(page.getByRole('heading', { name: 'Spec Kit Playground' })).toBeVisible();
  await expect(page.locator('.pane-sidebar')).toBeVisible();
  await expect(page.locator('.pane-editor')).toBeVisible();
  await expect(page.locator('.pane-preview')).toBeVisible();
});
