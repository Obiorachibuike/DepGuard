import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import semver from 'semver';
import { exists, readProjectFile, validPackageName, MAX_DEPENDENCIES } from './security.js';
import { object, parseLockfile } from './parsers/index.js';
import type { Project } from './types.js';

/** Discover a project without loading its code or executing its package scripts. */
export async function discoverProject(path = '.', preferredLockfile?: string): Promise<Project> {
  const root = await realpath(resolve(path));
  const manifest = object(JSON.parse(await readProjectFile(root, 'package.json')));
  const direct = new Set<string>(); const dev = new Set<string>();
  const declared = new Map<string, string>();
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(object(manifest[field] ?? {}))) {
      if (!validPackageName(name) || typeof range !== 'string') throw new Error('Invalid dependency in package.json');
      direct.add(name); declared.set(name, range);
      if (field === 'devDependencies') dev.add(name); else dev.delete(name);
      if (direct.size > MAX_DEPENDENCIES) throw new Error('Manifest exceeds dependency entry limit');
    }
  }
  const supported = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
  if (preferredLockfile && !supported.includes(preferredLockfile)) throw new Error('Unsupported lockfile selection');
  const available: string[] = [];
  for (const name of supported) if (await exists(resolve(root, name))) available.push(name);
  if (await exists(resolve(root, 'npm-shrinkwrap.json'))) throw new Error('npm-shrinkwrap.json is not supported; provide a project using package-lock.json');
  if (!preferredLockfile && available.length > 1) throw new Error('Ambiguous lockfiles: select one using --lockfile or configuration');
  if (preferredLockfile && !available.includes(preferredLockfile)) throw new Error('Selected lockfile does not exist');
  const lockfile = preferredLockfile ?? available[0];
  const manager = lockfile?.startsWith('pnpm') ? 'pnpm' : lockfile === 'yarn.lock' ? 'yarn' : 'npm';
  const name = typeof manifest.name === 'string' ? manifest.name : 'unnamed-project';
  if (lockfile) {
    const parsed = parseLockfile(lockfile, await readProjectFile(root, lockfile), direct, dev);
    return { root, name, manager, lockfile, ...parsed };
  }
  const warnings = ['No supported lockfile: only exact manifest versions can be checked; transitive coverage is unavailable.'];
  const dependencies = [...declared].flatMap(([name, version]) => {
    if (!semver.valid(version)) { warnings.push(`Unresolved version for ${name}; generate a lockfile to scan it.`); return []; }
    return [{ name, version, direct: true, dev: dev.has(name), locations: ['package.json'] }];
  });
  return { root, name, manager, dependencies, warnings };
}
