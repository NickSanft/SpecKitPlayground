import { expect, test } from '@playwright/test';
import { replaceEditorContent, snapshotSavedAt, waitForSaveAfter } from './helpers';

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

  await replaceEditorContent(page, '# Marker spec body');

  // Switch to plan, then back to spec
  await page.getByRole('button', { name: 'plan.md' }).click();
  await expect(page.locator('.preview-body')).toContainText('Implementation Plan');

  await page.getByRole('button', { name: 'spec.md' }).click();
  await expect(
    page.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).toContainText('Marker spec body');
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

test('edits persist across a page reload via IndexedDB auto-save', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Persisted Feature');
  await page.getByRole('button', { name: 'Create' }).click();

  await replaceEditorContent(page, '# Persisted spec marker');
  // replaceEditorContent waits for data-saved-at to advance, so the write is committed.
  await page.reload();

  await expect(page.locator('.tree-feature-dir')).toContainText('001-persisted-feature');
  await expect(
    page.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).toContainText('Persisted spec marker');
});

test('Delete all workspaces wipes IDB and seeds a fresh single workspace', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', (dialog) => dialog.accept());

  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Will Be Reset');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('.tree-feature-dir')).toHaveCount(1);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'Delete all workspaces…' }).click();

  await expect(page.locator('.tree-feature-dir')).toHaveCount(0);
  await expect(page.locator('.tree-leaf.is-active')).toContainText('constitution.md');

  await page.reload();
  await expect(page.locator('.tree-feature-dir')).toHaveCount(0);
});

test('renaming the workspace persists across reload', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  const before = await snapshotSavedAt(page);

  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: 'Rename this workspace…' }).click();

  const input = page.locator('.workspace-rename-input');
  await input.fill('Renamed Workspace');
  await input.press('Enter');

  await expect(page.locator('.workspace-name-text')).toHaveText('Renamed Workspace');
  await waitForSaveAfter(page, before);

  await page.reload();
  await expect(page.locator('.workspace-name-text')).toHaveText('Renamed Workspace');
});

test('create + switch between two workspaces, content stays isolated', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') await dialog.accept('Second Workspace');
    else await dialog.accept();
  });

  // Edit the constitution in the default workspace so we have a marker.
  // replaceEditorContent waits for the auto-save to commit before returning.
  await replaceEditorContent(page, '# Workspace A constitution');

  // Open switcher and create a new workspace.
  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: '+ New workspace…' }).click();
  await expect(page.locator('.workspace-name-text')).toHaveText('Second Workspace');

  // The new workspace should be a fresh seed (constitution template), not Workspace A's.
  await expect(
    page.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).not.toContainText('Workspace A constitution');

  // Switch back to the first workspace via the switcher.
  await page.locator('.workspace-name').click();
  // The first workspace is named "My Project" by default.
  await page.getByRole('menuitem', { name: 'My Project' }).click();
  await expect(page.locator('.workspace-name-text')).toHaveText('My Project');
  await expect(
    page.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).toContainText('Workspace A constitution');
});

test('deleting the active workspace falls back to a remaining one', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') await dialog.accept('To Delete');
    else await dialog.accept();
  });

  // Create a second workspace; we'll delete it and expect to land on the first.
  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: '+ New workspace…' }).click();
  await expect(page.locator('.workspace-name-text')).toHaveText('To Delete');

  // Delete the active workspace.
  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: 'Delete this workspace…' }).click();

  // We should land on "My Project" (the original default).
  await expect(page.locator('.workspace-name-text')).toHaveText('My Project');
});

test('deleting the LAST workspace seeds a fresh empty one', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', (dialog) => dialog.accept());

  // Add a feature so we can prove the post-delete workspace is fresh.
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Will Vanish');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: 'Delete this workspace…' }).click();

  // Workspace is back to default name + zero features.
  await expect(page.locator('.workspace-name-text')).toHaveText('My Project');
  await expect(page.locator('.tree-feature-dir')).toHaveCount(0);
});

test('export modal previews the file tree and downloads a zip', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  // Add a feature with an edit so it isn't filtered as empty
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Export Target');
  await page.getByRole('button', { name: 'Create' }).click();
  await replaceEditorContent(page, '# Edited spec');

  await page.getByRole('button', { name: 'Export workspace' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export workspace' });
  await dialog.waitFor();

  // File tree shows the expected leaves
  const treeText = await dialog.locator('.export-tree-list').first().textContent();
  expect(treeText).toContain('.specify');
  expect(treeText).toContain('memory');
  expect(treeText).toContain('constitution.md');
  expect(treeText).toContain('001-export-target');
  expect(treeText).toContain('spec.md');
  expect(treeText).toContain('templates');
  expect(treeText).toContain('README.md');

  // Toggling templates off updates the tree
  await dialog.getByText('Include templates folder').click();
  const treeAfter = await dialog.locator('.export-tree-list').first().textContent();
  expect(treeAfter).not.toContain('templates');

  // Download
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Download \.zip/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('my-project.zip');
});

test('per-doc Copy button shows feedback (clipboard write best-effort)', async ({
  page,
  context,
  browserName,
}) => {
  // WebKit doesn't accept these permission names; Chromium and Firefox do.
  if (browserName !== 'webkit') {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch {
      // ignore — fall back to UX-only assertion
    }
  }
  await page.goto('/SpecKitPlayground/');

  await replaceEditorContent(page, '# Clipboard marker');

  await page.getByRole('button', { name: 'Copy markdown to clipboard' }).click();
  // The button updates either to "Copied" (success) or "Copy failed" (no permission);
  // both prove the click handler ran.
  await expect(page.getByRole('button', { name: 'Copy markdown to clipboard' })).toContainText(
    /Copied|Copy failed/,
  );

  // On browsers that supported the permission grant, also verify the clipboard contents.
  if (browserName === 'chromium') {
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Clipboard marker');
  }
});

test('per-doc Download .md downloads the active document as markdown', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Download \.md/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('constitution.md');
});

test('theme toggle cycles system → light → dark → system and persists across reload', async ({
  page,
}) => {
  await page.goto('/SpecKitPlayground/');
  const html = page.locator('html');

  // Initially: system (no data-theme attribute)
  await expect(html).not.toHaveAttribute('data-theme', /.+/);

  const toggle = page.getByRole('button', { name: /Theme:/ });
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Persistence — dark survives reload
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // And cycles back to system
  await page.getByRole('button', { name: /Theme:/ }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('help modal opens via the ? button and lists keyboard shortcuts', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  await page.getByRole('button', { name: 'Show help' }).click();
  const dialog = page.getByRole('dialog', { name: 'About Spec Kit Playground' });
  await dialog.waitFor();

  await expect(dialog.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expect(dialog.getByText('Export workspace')).toBeVisible();
  await expect(dialog.getByText('Toggle sidebar')).toBeVisible();

  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).not.toBeVisible();
});

test('Cmd/Ctrl+B toggles the sidebar', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  // Click somewhere neutral so the editor doesn't have focus (shortcuts skip when editing)
  await page.locator('.app-header').click();

  const sidebar = page.locator('.pane-sidebar');
  await expect(sidebar).toBeVisible();

  // Use the modifier the in-page code expects, based on emulated platform.
  const isMacEmu = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  const modifier = isMacEmu ? 'Meta' : 'Control';

  await page.keyboard.press(`${modifier}+B`);
  await expect(sidebar).toBeHidden();

  await page.keyboard.press(`${modifier}+B`);
  await expect(sidebar).toBeVisible();
});

test('lint panel surfaces diagnostics and clicking one navigates to the doc', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', (dialog) => dialog.accept());

  // Add a feature without editing it — should trip "feature-untouched"
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Lint Bait');
  await page.getByRole('button', { name: 'Create' }).click();

  // Open lint panel
  await page.getByRole('button', { name: /Open lint panel/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Workspace lint' });
  await dialog.waitFor();

  // Constitution-not-default + feature-untouched should both be present
  await expect(dialog).toContainText('Constitution is still the unedited template');
  await expect(dialog).toContainText('Feature "Lint Bait" has no content yet');

  // Click the feature-untouched diagnostic and confirm we navigate to its spec
  await dialog.getByText('Feature "Lint Bait" has no content yet').click();
  await expect(page.locator('.tree-leaf.is-active')).toContainText('spec.md');
  await expect(dialog).not.toBeVisible();
});

test('lint panel reports "No issues found" once everything is filled in', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  // Edit constitution to satisfy both rules (>=3 ### headings, no template content)
  await replaceEditorContent(page, '# Edited\n\n### One\n### Two\n### Three\n\nGovernance prose.');

  await page.getByRole('button', { name: /Open lint panel/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Workspace lint' });
  await dialog.waitFor();
  await expect(dialog).toContainText('No issues found');
});

test('share modal exposes a URL that another browser context can import', async ({
  browser,
  page,
}) => {
  await page.goto('/SpecKitPlayground/');

  // Build a workspace with a marker so we can prove round-trip fidelity.
  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: 'Rename this workspace…' }).click();
  await page.locator('.workspace-rename-input').fill('Shared Project');
  await page.locator('.workspace-rename-input').press('Enter');
  await replaceEditorContent(page, '# Shared marker constitution');

  // Open share modal and grab the URL
  await page.getByRole('button', { name: 'Share workspace as link' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share this workspace' });
  await dialog.waitFor();
  const url = await dialog.locator('.share-url-input').inputValue();
  expect(url).toMatch(/#w=/);

  await dialog.getByRole('button', { name: 'Close' }).click();

  // Open the URL in a NEW context (fresh IndexedDB) — the import banner appears.
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(url);

  const banner = page2.locator('.import-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Shared Project');

  // Accept the import; the workspace becomes the active one.
  await banner.getByRole('button', { name: 'Import as new workspace' }).click();
  await expect(banner).not.toBeVisible();
  await expect(page2.locator('.workspace-name-text')).toHaveText('Shared Project');
  await expect(
    page2.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).toContainText('Shared marker constitution');

  // The URL fragment was stripped after import (so refresh doesn't re-prompt).
  expect(page2.url()).not.toContain('#w=');

  await ctx2.close();
});

test('share import banner can be dismissed without importing', async ({ browser, page }) => {
  await page.goto('/SpecKitPlayground/');
  await page.getByRole('button', { name: 'Share workspace as link' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share this workspace' });
  await dialog.waitFor();
  const url = await dialog.locator('.share-url-input').inputValue();

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(url);

  const banner = page2.locator('.import-banner');
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).not.toBeVisible();
  expect(page2.url()).not.toContain('#w=');

  await ctx2.close();
});

test('combined-md export round-trips back via DropZone import', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  // Set up a recognisable workspace
  await page.locator('.workspace-name').click();
  await page.getByRole('menuitem', { name: 'Rename this workspace…' }).click();
  await page.locator('.workspace-rename-input').fill('Round Trip MD');
  await page.locator('.workspace-rename-input').press('Enter');
  await replaceEditorContent(page, '# Round trip constitution');

  // Switch to combined-md export and capture the downloaded contents
  await page.getByRole('button', { name: 'Export workspace' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export workspace' });
  await dialog.waitFor();
  await dialog.getByText('Single combined .md').click();

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Download \.md/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('round-trip-md.md');

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(downloadPath!, 'utf8');
  expect(content).toContain('<!-- spk:workspace name="Round Trip MD"');
  expect(content).toContain('<!-- spk:constitution -->');
  expect(content).toContain('Round trip constitution');

  // Now drop the file back onto the app via the DataTransfer API
  await page.evaluate(async (text) => {
    const file = new File([text], 'round-trip-md.md', { type: 'text/markdown' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const drop = new DragEvent('drop', { bubbles: true, dataTransfer: dt });
    document.dispatchEvent(drop);
  }, content);

  const banner = page.locator('.import-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Round Trip MD');
  await banner.getByRole('button', { name: 'Import as new workspace' }).click();

  // The active workspace is now the imported copy with the preserved constitution
  await expect(page.locator('.workspace-name-text')).toHaveText('Round Trip MD');
  await expect(
    page.locator('.preview-body').getByRole('heading', { level: 1 }).first(),
  ).toContainText('Round trip constitution');
});

test('diff view highlights changes since baseline; mark baseline clears them', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  // Replace the constitution and wait for save (data-saved-at advances).
  await replaceEditorContent(page, '# Original constitution\n\n## Section A\n\nbody one');

  // Open the diff view from the doc-actions toolbar.
  await page.getByRole('button', { name: 'View diff against baseline' }).click();
  // The fresh workspace was created with baseline = template content, so the
  // initial diff against the now-edited content should show changes.
  const diffSummary = page.locator('.diff-header .diff-summary');
  await expect(diffSummary).toBeVisible();
  await expect(page.locator('.diff-line-added').first()).toBeVisible();

  // Header shows the changed-doc pip.
  await expect(page.locator('.changed-pip')).toContainText('changed');

  // Mark current as baseline → diff becomes empty + pip disappears.
  await page.getByRole('button', { name: 'Mark current content as baseline' }).click();
  await expect(page.locator('.diff-empty')).toBeVisible();
  await expect(page.locator('.changed-pip')).toHaveCount(0);

  // Switch back to edit, change a line, switch to diff again — that line shows up.
  await page.getByRole('button', { name: 'Switch to edit view' }).click();
  await replaceEditorContent(page, '# Original constitution\n\n## Section A\n\nbody two — edited');
  await page.getByRole('button', { name: 'View diff against baseline' }).click();
  await expect(page.locator('.diff-line-removed')).toContainText('body one');
  await expect(page.locator('.diff-line-added')).toContainText('body two — edited');
});

test('search panel finds matches across docs and clicking a result navigates', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');

  // Add a feature with content we can find by a unique token.
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Searchable');
  await page.getByRole('button', { name: 'Create' }).click();
  await replaceEditorContent(page, '# Spec\n\nA UNIQUEPROBE token to find.');

  // Open search and query.
  await page.getByRole('button', { name: 'constitution.md' }).click();
  await page.getByRole('button', { name: 'Show help' }).click();
  // Use the keyboard shortcut from the help modal text — close it then trigger.
  await page.getByRole('button', { name: 'Got it' }).click();

  // Trigger Cmd/Ctrl+Shift+F via the running platform.
  const isMacEmu = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  const mod = isMacEmu ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+Shift+F`);

  const dialog = page.getByRole('dialog', { name: 'Search workspace' });
  await dialog.waitFor();

  await page.locator('.search-input').fill('UNIQUEPROBE');
  const results = page.locator('.search-result');
  await expect(results.first()).toBeVisible();
  await expect(results.first()).toContainText('spec.md — Searchable');

  // Click the first result; we should land on that doc and the dialog closes.
  await results.first().getByRole('option').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.tree-leaf.is-active')).toContainText('spec.md');
});

test('disabling a lint rule via Configure removes its diagnostics + drops the pip', async ({
  page,
}) => {
  await page.goto('/SpecKitPlayground/');
  page.on('dialog', (dialog) => dialog.accept());

  // Add an empty feature so we trip BOTH constitution-not-default AND feature-untouched.
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('Untouched');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: /Open lint panel/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Workspace lint' });
  await dialog.waitFor();

  // Both diagnostics we care about are present at first
  await expect(dialog).toContainText('Constitution is still the unedited template');
  await expect(dialog).toContainText('Feature "Untouched" has no content yet');

  // Capture the initial pip count so we can assert it strictly drops by 1 after disabling.
  await dialog.getByRole('button', { name: 'Close' }).click();
  const initialPip = Number(await page.locator('.lint-pip').textContent());
  expect(initialPip).toBeGreaterThanOrEqual(2);

  // Re-open the panel and disable feature-untouched via Configure.
  await page.getByRole('button', { name: /Open lint panel/ }).click();
  await dialog.getByRole('tab', { name: 'Configure' }).click();
  await dialog.getByRole('checkbox', { name: /Disable rule feature-untouched/ }).uncheck();

  // Switch back to Diagnostics — feature-untouched is gone, constitution-not-default still shows.
  await dialog.getByRole('tab', { name: /Diagnostics/ }).click();
  await expect(dialog).not.toContainText('Feature "Untouched" has no content yet');
  await expect(dialog).toContainText('Constitution is still the unedited template');

  // Close the modal and verify the pip dropped by exactly 1.
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.lint-pip')).toHaveText(String(initialPip - 1));
});

test('raw HTML pasted into the editor is escaped, not rendered', async ({ page }) => {
  await page.goto('/SpecKitPlayground/');
  await replaceEditorContent(page, '<script>window.__pwned=true</script>');

  await page.waitForTimeout(200);

  const pwned = await page.evaluate(() =>
    Boolean((window as unknown as { __pwned?: boolean }).__pwned),
  );
  expect(pwned).toBe(false);

  const previewHtml = await page.locator('.preview-body').innerHTML();
  expect(previewHtml).not.toContain('<script');
});
