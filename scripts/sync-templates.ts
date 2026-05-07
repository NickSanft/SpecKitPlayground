/**
 * Fetch the canonical Spec Kit templates from github/spec-kit@main and write
 * them into src/templates/ as raw markdown. Re-run after upstream releases.
 *
 *   npm run sync-templates
 *
 * The committed files are what Vite imports via `?raw`, so the build never
 * needs network access. This keeps CI deterministic.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'src', 'templates');

const SOURCES: Array<{ remote: string; local: string }> = [
  { remote: 'constitution-template.md', local: 'constitution.md' },
  { remote: 'spec-template.md', local: 'spec.md' },
  { remote: 'plan-template.md', local: 'plan.md' },
  { remote: 'tasks-template.md', local: 'tasks.md' },
];

const RAW_BASE = 'https://raw.githubusercontent.com/github/spec-kit/main/templates';

async function fetchOne(remote: string): Promise<string> {
  const url = `${RAW_BASE}/${remote}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const results = await Promise.all(
    SOURCES.map(async ({ remote, local }) => {
      const body = await fetchOne(remote);
      const target = resolve(OUT_DIR, local);
      await writeFile(target, body, 'utf8');
      return { local, bytes: body.length };
    }),
  );

  const lines = results.map(({ local, bytes }) => `  ${local.padEnd(20)} ${bytes} bytes`);
  process.stdout.write(`Synced ${results.length} templates from github/spec-kit@main:\n`);
  process.stdout.write(lines.join('\n') + '\n');
}

main().catch((err: unknown) => {
  process.stderr.write(
    `sync-templates failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
