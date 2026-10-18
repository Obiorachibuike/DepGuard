import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const pkg = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const tag = process.env.RELEASE_TAG;
assert.equal(
  tag,
  `v${pkg.version}`,
  'GitHub Release tag must exactly match v<package.json version>',
);
const prerelease = pkg.version.includes('-');
assert.equal(
  process.env.RELEASE_PRERELEASE,
  String(prerelease),
  'GitHub prerelease flag must match the package version',
);
assert.equal(pkg.private, undefined, 'The root package must be publishable');
assert.equal(pkg.publishConfig.access, 'public');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.equal(
  pkg.repository.url,
  'git+https://github.com/Obiorachibuike/DepGuard.git',
);
console.log(
  `Release metadata verified: ${pkg.name}@${pkg.version}; dist-tag ${prerelease ? 'next' : 'latest'}`,
);
