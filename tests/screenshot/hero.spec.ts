import { test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceEditorContent } from '../e2e/helpers';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HERO_PATH = path.resolve(HERE, '..', '..', 'docs', 'hero.png');

test('capture hero screenshot for the README', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/SpecKitPlayground/');

  // Switch to dark mode for a more striking screenshot
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  // Add a feature with substantive content so the panes look populated
  await page.getByRole('button', { name: '+ Add feature' }).click();
  await page.locator('.modal-input').fill('User Authentication');
  await page.getByRole('button', { name: 'Create' }).click();

  // Set content directly via CM's API to bypass auto-list-continuation.
  const content = [
    '# Feature: User Authentication',
    '',
    '## Why this exists',
    '',
    'Users need a single, predictable sign-in flow that works whether they are on',
    'web, desktop, or mobile. Auth is currently scattered across three modules and',
    'the inconsistency hurts both onboarding and trust.',
    '',
    '## Success criteria',
    '',
    'A returning user signs in with email and password and lands on the dashboard',
    'in under 800ms. A new user signs up, verifies email, and is taken through a',
    'three-step onboarding flow. A user resets a forgotten password without ever',
    'contacting support.',
    '',
    '## Out of scope',
    '',
    'SSO providers and two-factor authentication are tracked separately and will',
    'land in v2.',
  ].join('\n');

  await page.evaluate((next) => {
    const view = (
      document.querySelector('.cm-editor') as
        | (HTMLElement & {
            cmView?: {
              view: { state: { doc: { length: number } }; dispatch: (t: unknown) => void };
            };
          })
        | null
    )?.cmView;
    if (view) {
      view.view.dispatch({
        changes: { from: 0, to: view.view.state.doc.length, insert: next },
      });
    }
  }, content);

  // Fallback: if the cmView trick doesn't work in this CM version, use the helper.
  const editorText = await page.locator('.cm-content').textContent();
  if (!editorText || !editorText.includes('Why this exists')) {
    await replaceEditorContent(page, content);
  }

  await page.locator('.app-header').click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: HERO_PATH, fullPage: false });
});
