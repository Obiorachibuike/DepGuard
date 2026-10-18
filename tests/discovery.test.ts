import { describe, expect, it } from 'vitest';
import { writeFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverProject, parseLockfile, loadConfig } from '../src/index.js';
import { readProjectFile } from '../src/security.js';
import { fixture, temp } from './helpers.js';
const direct = new Set(['demo']);
const dev = new Set<string>();
describe('discovery and untrusted lockfiles', () => {
  it('discovers npm direct and transitive dependencies without running scripts', async () => {
    const result = await discoverProject(await fixture('1.0.0', true));
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies.map((d) => d.direct)).toEqual([true, false]);
  });
  it.each([2, 3])('parses npm v%s', (lockfileVersion) => {
    expect(
      parseLockfile(
        'package-lock.json',
        JSON.stringify({
          lockfileVersion,
          packages: { 'node_modules/demo': { version: '1.0.0' } },
        }),
        direct,
        dev,
      ).dependencies[0]?.version,
    ).toBe('1.0.0');
  });
  it('parses nested npm v1 iteratively', () => {
    const parsed = parseLockfile(
      'package-lock.json',
      JSON.stringify({
        lockfileVersion: 1,
        dependencies: {
          demo: {
            version: '1.0.0',
            dependencies: { demo: { version: '2.0.0' } },
          },
        },
      }),
      direct,
      dev,
    );
    expect(parsed.dependencies.map((d) => d.direct)).toEqual([true, false]);
  });
  it.each(['6.0', '9.0'])('parses pnpm %s with peer suffixes', (version) => {
    const text = `lockfileVersion: '${version}'\nimporters:\n  .:\n    dependencies:\n      demo:\n        specifier: ^1\n        version: 1.0.0(peer@2.0.0)\npackages:\n  ${version === '6.0' ? '/demo@' : 'demo@'}1.0.0(peer@2.0.0): {}\n`;
    expect(
      parseLockfile('pnpm-lock.yaml', text, direct, dev).dependencies[0],
    ).toMatchObject({ name: 'demo', version: '1.0.0', direct: true });
  });
  it('parses Yarn Classic grouped selectors', () => {
    expect(
      parseLockfile(
        'yarn.lock',
        '# yarn lockfile v1\n\ndemo@^1.0.0, demo@~1.0.0:\n  version "1.0.0"\n',
        direct,
        dev,
      ).dependencies,
    ).toHaveLength(1);
  });
  it('parses Yarn Berry npm descriptors', () => {
    expect(
      parseLockfile(
        'yarn.lock',
        '__metadata:\n  version: 8\n"demo@npm:^1":\n  version: 1.0.0\n  resolution: "demo@npm:1.0.0"\n',
        direct,
        dev,
      ).dependencies[0]?.name,
    ).toBe('demo');
  });
  it('rejects malformed JSON and unsupported versions', () => {
    expect(() =>
      parseLockfile('package-lock.json', '{', direct, dev),
    ).toThrow();
    expect(() =>
      parseLockfile('package-lock.json', '{"lockfileVersion":99}', direct, dev),
    ).toThrow('Unsupported');
    expect(() =>
      parseLockfile('pnpm-lock.yaml', 'lockfileVersion: 99', direct, dev),
    ).toThrow('Unsupported');
  });
  it('rejects duplicate YAML keys and alias expansion', () => {
    expect(() =>
      parseLockfile(
        'pnpm-lock.yaml',
        'lockfileVersion: 9\npackages: {}\npackages: {}',
        direct,
        dev,
      ),
    ).toThrow();
    expect(() =>
      parseLockfile(
        'pnpm-lock.yaml',
        'lockfileVersion: 9\nanchor: &x {version: 1}\npackages: *x',
        direct,
        dev,
      ),
    ).toThrow();
  });
  it('reports non-registry entries, not empty safety', () => {
    expect(
      parseLockfile(
        'package-lock.json',
        '{"lockfileVersion":3,"packages":{"node_modules/demo":{"version":"file:../private"}}}',
        direct,
        dev,
      ).warnings.length,
    ).toBeGreaterThan(0);
  });
  it('does not use lockfile locations as filesystem paths', () => {
    const result = parseLockfile(
      'package-lock.json',
      '{"lockfileVersion":3,"packages":{"../../etc/passwd":{"version":"1.0.0"}}}',
      direct,
      dev,
    );
    expect(result.dependencies).toEqual([]);
  });
  it('rejects ambiguous lockfiles but allows explicit selection', async () => {
    const dir = await fixture();
    await writeFile(join(dir, 'yarn.lock'), '');
    await expect(discoverProject(dir)).rejects.toThrow('Ambiguous');
    expect((await discoverProject(dir, 'package-lock.json')).manager).toBe(
      'npm',
    );
    await expect(discoverProject(dir, '../../etc/passwd')).rejects.toThrow(
      'Unsupported',
    );
  });
  it('reports manifest-only and unresolved dependencies', async () => {
    const dir = await temp();
    await writeFile(
      join(dir, 'package.json'),
      '{"dependencies":{"demo":"^1","exact":"1.0.0"}}',
    );
    const result = await discoverProject(dir);
    expect(result.dependencies).toHaveLength(1);
    expect(result.warnings.length).toBe(2);
  });
  it('rejects file traversal and symlinks outside the project', async () => {
    const dir = await fixture();
    const outside = await temp();
    await writeFile(join(outside, 'secret.json'), '{}');
    await symlink(join(outside, 'secret.json'), join(dir, 'evil.json'));
    await expect(
      readProjectFile(dir, '../' + outside.split('/').at(-1) + '/secret.json'),
    ).rejects.toThrow('escapes');
    await expect(loadConfig(dir, 'evil.json')).rejects.toThrow('escapes');
  });
  it('validates config and never executes JS configuration', async () => {
    const dir = await fixture();
    await writeFile(join(dir, '.depguardrc.json'), '{"timeoutMs":0}');
    await expect(loadConfig(dir)).rejects.toThrow();
  });
});
it.each(['npm', 'pnpm', 'yarn'])(
  'discovers the checked-in %s example without installation',
  async (manager) => {
    const project = await discoverProject(`examples/${manager}`);
    expect(project.manager).toBe(manager);
    expect(project.dependencies[0]).toMatchObject({
      name: 'is-number',
      version: '7.0.0',
      direct: true,
    });
  },
);
it('does not classify a dependency as dev-only when both manifest sections declare it', async () => {
  const dir = await temp();
  await writeFile(
    join(dir, 'package.json'),
    '{"dependencies":{"demo":"1.0.0"},"devDependencies":{"demo":"1.0.0"}}',
  );
  const project = await discoverProject(dir);
  expect(project.dependencies[0]?.dev).toBe(false);
});
it('does not query local npm workspace versions as public registry packages', () => {
  const parsed = parseLockfile(
    'package-lock.json',
    '{"lockfileVersion":3,"packages":{"packages/private-app":{"name":"private-app","version":"1.0.0"}}}',
    new Set(),
    new Set(),
  );
  expect(parsed.dependencies).toHaveLength(0);
  expect(parsed.warnings.join()).toContain('workspace');
});
