import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { temp } from './helpers.js';
const exec = promisify(execFile);
const manifest = JSON.parse(
  await (await import('node:fs/promises')).readFile('package.json', 'utf8'),
) as { name: string; version: string };

it('accepts only a matching release tag and prerelease flag', async () => {
  await expect(
    exec(process.execPath, ['scripts/check-release.mjs'], {
      env: {
        ...process.env,
        RELEASE_TAG: `v${manifest.version}`,
        RELEASE_PRERELEASE: String(manifest.version.includes('-')),
      },
    }),
  ).resolves.toHaveProperty('stdout');
  for (const [tag, prerelease] of [
    ['v99.0.0', 'false'],
    [`v${manifest.version}`, String(!manifest.version.includes('-'))],
    ['$(echo injection)', 'false'],
  ]) {
    await expect(
      exec(process.execPath, ['scripts/check-release.mjs'], {
        env: {
          ...process.env,
          RELEASE_TAG: tag,
          RELEASE_PRERELEASE: prerelease,
        },
      }),
    ).rejects.toMatchObject({ code: 1 });
  }
});
async function artifact() {
  const dir = await temp();
  const filename = 'release.tgz';
  const body = Buffer.from('test fixture archive, not published');
  const integrity =
    'sha512-' + createHash('sha512').update(body).digest('base64');
  await writeFile(join(dir, filename), body);
  const pack = [
    { name: manifest.name, version: manifest.version, filename, integrity },
  ];
  await writeFile(join(dir, 'pack.json'), JSON.stringify(pack));
  return { dir, integrity };
}
async function mockRegistry(dir: string, status: number, integrity: string) {
  const preload = join(dir, 'registry.mjs');
  // Patch the child_process export as a hard safety interlock. These tests must never run npm publish.
  await writeFile(
    preload,
    `import cp from 'node:child_process';\nimport {syncBuiltinESMExports} from 'node:module';\ncp.execFile = () => { throw new Error('Publication forbidden in deterministic tests'); };\nsyncBuiltinESMExports();\nglobalThis.fetch = async () => Response.json({dist:{integrity:${JSON.stringify(integrity)}}}, {status:${status}});`,
  );
  return ['--import', preload, resolve('scripts/publish-release.mjs'), dir];
}
it('skips an already published byte-identical version without executing npm', async () => {
  const { dir, integrity } = await artifact();
  const result = await exec(
    process.execPath,
    await mockRegistry(dir, 200, integrity),
  );
  expect(result.stdout).toContain('No publication performed');
});
it('rejects replacement of an existing npm version with different integrity', async () => {
  const { dir } = await artifact();
  await expect(
    exec(process.execPath, await mockRegistry(dir, 200, 'sha512-other')),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('different contents'),
  });
});
it('refuses registry errors instead of assuming a version is unpublished', async () => {
  const { dir, integrity } = await artifact();
  await expect(
    exec(process.execPath, await mockRegistry(dir, 503, integrity)),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('ambiguous lookup'),
  });
});
it('rejects a tampered package artifact before performing a network request', async () => {
  const { dir } = await artifact();
  await writeFile(join(dir, 'release.tgz'), 'tampered');
  await expect(
    exec(process.execPath, [resolve('scripts/publish-release.mjs'), dir]),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('Archive integrity'),
  });
});
it('requires exactly one archive', async () => {
  const dir = await temp();
  await expect(
    exec(process.execPath, [resolve('scripts/publish-release.mjs'), dir]),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('exactly one'),
  });
});
it('keeps CLI and SARIF versions consistent with the manifest', async () => {
  const result = await exec(process.execPath, ['dist/cli.js', '--version']);
  expect(result.stdout.trim()).toBe(manifest.version);
  const { scan, renderReport } = await import('../src/index.js');
  const { fixture } = await import('./helpers.js');
  const report = await scan({
    path: await fixture(),
    config: { health: false },
    providers: [{ name: 'fixture', query: async () => [] }],
  });
  expect(
    JSON.parse(renderReport(report, 'sarif')).runs[0].tool.driver.version,
  ).toBe(manifest.version);
});
