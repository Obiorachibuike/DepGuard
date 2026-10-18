import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { FileCache } from '../src/index.js';
import { fixture, temp } from './helpers.js';
const exec = promisify(execFile);
const cli = resolve('dist/cli.js');
it('offers help and explanation without network access', async () => {
  expect((await exec(process.execPath, [cli, '--help'])).stdout).toContain(
    'outdated',
  );
  expect(
    (await exec(process.execPath, [cli, 'explain', 'coverage'])).stdout,
  ).toContain('Exit 2');
});
it('init creates JSON once without overwriting', async () => {
  const dir = await fixture();
  await exec(process.execPath, [cli, 'init', dir]);
  expect(
    JSON.parse(await readFile(join(dir, '.depguardrc.json'), 'utf8')).severity,
  ).toBe('high');
  await expect(
    exec(process.execPath, [cli, 'init', dir]),
  ).rejects.toMatchObject({ code: 2 });
});
it('returns 2 for invalid arguments and incomplete offline scans', async () => {
  const dir = await fixture();
  await expect(
    exec(process.execPath, [cli, 'scan', dir, '--format', 'invalid']),
  ).rejects.toMatchObject({ code: 2 });
  await expect(
    exec(process.execPath, [cli, 'scan', dir, '--offline', '--no-health']),
  ).rejects.toMatchObject({ code: 2 });
});
it.each([false, true])(
  'returns correct CLI finding exit code (vulnerable=%s) from offline cached OSV data',
  async (vulnerable) => {
    const home = await temp();
    const dir = await fixture();
    const cache = new FileCache(join(home, '.cache/depguard/v1'));
    const body = {
      package: { name: 'demo', ecosystem: 'npm' },
      version: '1.0.0',
    };
    await cache.set(
      `https://api.osv.dev/v1/query\n${JSON.stringify(body)}`,
      vulnerable
        ? {
            vulns: [
              {
                id: 'TEST-001',
                summary: 'Fixture',
                database_specific: { severity: 'HIGH' },
                affected: [
                  {
                    package: { name: 'demo', ecosystem: 'npm' },
                    ranges: [
                      {
                        type: 'SEMVER',
                        events: [{ introduced: '0' }, { fixed: '1.2.0' }],
                      },
                    ],
                  },
                ],
              },
            ],
          }
        : {},
    );
    try {
      const result = await exec(
        process.execPath,
        [cli, 'scan', dir, '--json', '--offline', '--no-health'],
        { env: { ...process.env, HOME: home } },
      );
      expect(vulnerable).toBe(false);
      expect(JSON.parse(result.stdout).exitCode).toBe(0);
    } catch (error) {
      expect(vulnerable).toBe(true);
      expect(error).toMatchObject({ code: 1 });
    }
  },
);
it('will not overwrite an existing output report', async () => {
  const dir = await fixture();
  const file = join(dir, 'report.json');
  await writeFile(file, 'keep');
  await expect(
    exec(process.execPath, [
      cli,
      'scan',
      dir,
      '--offline',
      '--no-health',
      '--output',
      file,
    ]),
  ).rejects.toMatchObject({ code: 2 });
  expect(await readFile(file, 'utf8')).toBe('keep');
});
