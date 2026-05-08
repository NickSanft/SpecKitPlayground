import { expect, test } from '@playwright/test';

test('app shell renders at the configured base path with constitution active', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await expect(
    page.getByRole('heading', { name: 'Spec Kit Playground', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pane-sidebar')).toBeVisible();
  await expect(page.locator('.pane-editor')).toBeVisible();
  await expect(page.locator('.pane-preview')).toBeVisible();

  // Constitution.md is selected and the sidebar has only Memory > constitution.md
  await expect(page.locator('.tree-leaf.is-active')).toContainText('constitution.md');

  // The seeded constitution template renders in the preview
  await expect(page.locator('.preview-body').getByRole('heading', { level: 1 })).toContainText(
    'Constitution',
  );
});

test('adding a feature seeds spec/plan/tasks and switches to its spec', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.getByRole('dialog', { name: 'New feature' }).waitFor();
  await page.getByLabel('Title').or(page.locator('.modal-input')).fill('User Auth');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.locator('.tree-feature-dir')).toContainText('001-user-auth');
  await expect(page.locator('.tree-feature-title')).toContainText('User Auth');

  // Active should be the new feature's spec
  await expect(page.locator('.tree-leaf.is-active')).toContainText('spec.md');
  await expect(page.locator('.preview-body')).toContainText('Feature Specification');
});

test('adding multiple features assigns sequential numbers', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  for (const title of ['Alpha', 'Beta', 'Gamma']) {
    await page.getByRole('button', { name: '+ Add feature' }).click();
    await page.getByRole('dialog', { name: 'New feature' }).waitFor();
    await page.locator('.modal-input').fill(title);
    await page.getByRole('button', { name: 'Create' }).click();
  }

  const dirs = await page.locator('.tree-feature-dir').allTextContents();
  expect(dirs).toEqual(['001-alpha', '002-beta', '003-gamma']);
});

test('switching documents swaps editor and preview content', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Switching Test');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: 'plan.md' }).click();
  await expect(page.locator('.tree-leaf.is-active')).toContainText('plan.md');
  await expect(page.locator('.preview-body')).toContainText('Implementation Plan');

  await page.getByRole('button', { name: 'tasks.md' }).click();
  await expect(page.locator('.tree-leaf.is-active')).toContainText('tasks.md');
  await expect(page.locator('.preview-body')).toContainText('Tasks');

  await page.getByRole('button', { name: 'constitution.md' }).click();
  await expect(page.locator('.preview-body')).toContainText('Constitution');
});

test('edits to one doc are preserved after switching away and back', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Persistence');
  await page.getByRole('button', { name: 'Create' }).click();

  // Replace the spec content with a marker
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('# Marker spec body');

  // Switch to plan, then back to spec
  await page.getByRole('button', { name: 'plan.md' }).click();
  await expect(page.locator('.preview-body')).toContainText('Implementation Plan');

  await page.getByRole('button', { name: 'spec.md' }).click();
  await expect(page.locator('.preview-body').getByRole('heading', { level: 1 })).toContainText(
    'Marker spec body',
  );
});

test('deleting a feature does not recycle numbers', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', (dialog) => dialog.accept());

  for (const title of ['One', 'Two', 'Three']) {
    await page.getByRole('button', { name: '+ Add feature' }).click();
    await page.locator('.modal-input').fill(title);
    await page.getByRole('button', { name: 'Create' }).click();
  }

  await page.getByRole('button', { name: 'Delete Two' }).click();

  await expect(page.locator('.tree-feature-dir')).toHaveCount(2);
  const dirs = await page.locator('.tree-feature-dir').allTextContents();
  expect(dirs).toEqual(['001-one', '003-three']);

  // Add another — should be 004, not recycle 002
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Four');
  await page.getByRole('button', { name: 'Create' }).click();

  const finalDirs = await page.locator('.tree-feature-dir').allTextContents();
  expect(finalDirs).toEqual(['001-one', '003-three', '004-four']);
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
