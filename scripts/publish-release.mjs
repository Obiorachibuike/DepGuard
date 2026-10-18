import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const directory = resolve(process.argv[2] ?? 'release-artifacts');
const entries = await readdir(directory);
const archives = entries.filter((file) => file.endsWith('.tgz'));
assert.equal(
  archives.length,
  1,
  'Expected exactly one verified package archive',
);
const [pack] = JSON.parse(await readFile(join(directory, 'pack.json'), 'utf8'));
const pkg = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
assert.equal(pack.name, pkg.name);
assert.equal(pack.version, pkg.version);
assert.equal(pack.filename, archives[0]);
const integrity =
  'sha512-' +
  createHash('sha512')
    .update(await readFile(join(directory, archives[0])))
    .digest('base64');
assert.equal(
  integrity,
  pack.integrity,
  'Archive integrity does not match its verification manifest',
);
// Avoid treating connectivity/authentication failures as evidence a package is unpublished.
const response = await fetch(
  `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`,
  { signal: AbortSignal.timeout(15_000), redirect: 'error' },
);
if (response.ok) {
  const existing = await response.json();
  assert.equal(
    existing.dist?.integrity,
    pack.integrity,
    'This version already exists with different contents. Bump the version; npm versions are immutable.',
  );
  console.log(
    `${pkg.name}@${pkg.version} already has this exact integrity. No publication performed.`,
  );
} else {
  assert.equal(
    response.status,
    404,
    `Registry returned HTTP ${response.status}; refusing to publish on an ambiguous lookup`,
  );
  const tag = pkg.version.includes('-') ? 'next' : 'latest';
  // OIDC authentication is performed by npm. No token or npm login is used in CI.
  const result = await exec(
    'npm',
    [
      'publish',
      join(directory, archives[0]),
      '--access',
      'public',
      '--provenance',
      '--tag',
      tag,
      '--ignore-scripts',
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}
