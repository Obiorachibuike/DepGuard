import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';
import type { Advisory, Dependency } from '../src/types.js';
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((d) => rm(d, { force: true, recursive: true }))); });
export async function temp(): Promise<string> { const dir = await mkdtemp(join(tmpdir(), 'depguard-test-')); dirs.push(dir); return dir; }
export async function fixture(version = '1.0.0', transitive = false): Promise<string> {
  const dir = await temp();
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', dependencies: { demo: '^1.0.0' }, scripts: { preinstall: 'exit 99' } }));
  await writeFile(join(dir, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/demo': { version }, ...(transitive ? { 'node_modules/demo/node_modules/child': { version: '2.0.0' } } : {}) } }));
  return dir;
}
export const dep: Dependency = { name: 'demo', version: '1.0.0', direct: true, dev: false, locations: ['node_modules/demo'] };
/** Synthetic test advisory, never used as production intelligence. */
export const advisory: Advisory = { id: 'TEST-001', aliases: ['CVE-2099-0001'], summary: 'Synthetic test advisory', severity: 'high', url: 'https://osv.dev/vulnerability/TEST-001', affected: [{ name: 'demo', versions: [], ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '1.2.0' }] }] }] };
