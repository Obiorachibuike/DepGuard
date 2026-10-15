import { parse as parseYaml } from 'yaml';
import * as yarnLockfile from '@yarnpkg/lockfile';
// Normalize the legacy package's CommonJS interop in Node and test bundlers.
const yarnModule = yarnLockfile as unknown as { parse?: typeof yarnLockfile.parse; default?: { parse?: typeof yarnLockfile.parse } };
const parseYarn = yarnModule.parse ?? yarnModule.default?.parse;

import semver from 'semver';
import { MAX_DEPENDENCIES, validPackageName } from '../security.js';
import type { Dependency } from '../types.js';

type Row = Record<string, unknown>;
export function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object in project data');
  return value as Row;
}
function entries(value: unknown): [string, unknown][] { return Object.entries(object(value ?? {})); }
export interface ParseResult { dependencies: Dependency[]; warnings: string[] }
export function parseLockfile(filename: string, text: string, direct: Set<string>, dev: Set<string>): ParseResult {
  const output = new Map<string, Dependency>();
  const warnings = new Set<string>();
  let visited = 0;
  function add(name: string, version: unknown, location: string, development = false, isDirect = direct.has(name)) {
    if (++visited > MAX_DEPENDENCIES) throw new Error('Lockfile exceeds 50,000 dependency entries');
    if (!validPackageName(name) || typeof version !== 'string' || !semver.valid(version)) {
      warnings.add('Non-registry, unresolved, or invalid dependency entries were skipped; coverage is incomplete.');
      return;
    }
    const key = `${name}@${version}`;
    const prior = output.get(key);
    if (prior) { prior.direct ||= isDirect; prior.dev &&= development; if (!prior.locations.includes(location)) prior.locations.push(location); }
    else output.set(key, { name, version, direct: isDirect, dev: development, locations: [location] });
  }
  if (filename === 'package-lock.json') {
    const lock = object(JSON.parse(text));
    if (![1, 2, 3].includes(Number(lock.lockfileVersion))) throw new Error('Unsupported npm lockfileVersion (supported: 1, 2, 3)');
    if (Number(lock.lockfileVersion) >= 2) {
      if (!lock.packages) throw new Error('Malformed npm lockfile: packages is missing');
      for (const [location, raw] of entries(lock.packages)) {
        if (!location) continue;
        const row = object(raw);
        if (row.link) { warnings.add('Workspace/link dependencies are not scanned as registry packages.'); continue; }
        const inferred = location.split('node_modules/').at(-1)!;
        const name = typeof row.name === 'string' ? row.name : inferred;
        add(name, row.version, location, row.dev === true, location === `node_modules/${inferred}` && direct.has(inferred));
      }
    } else {
      const stack: { rows: unknown; path: string; depth: number }[] = [{ rows: lock.dependencies ?? {}, path: '', depth: 0 }];
      while (stack.length) {
        const item = stack.pop()!;
        if (item.depth > 128) throw new Error('Lockfile dependency nesting exceeds 128');
        for (const [name, raw] of entries(item.rows)) {
          const row = object(raw);
          const location = `${item.path}node_modules/${name}`;
          add(name, row.version, location, row.dev === true, item.depth === 0 && direct.has(name));
          if (row.dependencies) stack.push({ rows: row.dependencies, path: `${location}/`, depth: item.depth + 1 });
        }
      }
    }
  } else if (filename === 'pnpm-lock.yaml') {
    const lock = object(parseYaml(text, { maxAliasCount: 0, uniqueKeys: true }));
    const version = String(lock.lockfileVersion);
    if (!/^[6-9](?:\.\d+)?$/.test(version)) throw new Error('Unsupported pnpm lockfileVersion (supported: 6–9)');
    const importer = lock.importers ? object(object(lock.importers)['.'] ?? {}) : lock;
    const rootVersions = new Map<string, string>();
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, raw] of entries(importer[field])) {
        const value = typeof raw === 'string' ? raw : object(raw).version;
        if (typeof value === 'string') rootVersions.set(name, value.replace(/\(.*/, ''));
      }
    }
    for (const [key] of entries(lock.packages)) {
      const clean = key.replace(/^\//, '').replace(/\(.*/, '');
      const match = clean.match(/^(@[^/]+\/[^@/]+|[^@/]+)(?:@|\/)([^/]+)$/);
      if (!match) { warnings.add('Unrecognized pnpm package key; coverage is incomplete.'); continue; }
      const name = match[1]!; const version = match[2]!;
      add(name, version, key, dev.has(name), direct.has(name) && rootVersions.get(name) === version);
    }
    if (lock.importers && Object.keys(object(lock.importers)).some((key) => key !== '.')) warnings.add('pnpm workspace importers beyond the root are not classified; scan each workspace separately.');
    warnings.add('pnpm development classification is available only for direct dependencies.');
  } else if (filename === 'yarn.lock') {
    const berry = /^__metadata:/m.test(text);
    let rows: Row;
    if (berry) {
      rows = object(parseYaml(text, { maxAliasCount: 0, uniqueKeys: true }));
      const version = Number(object(rows.__metadata).version);
      if (![4, 5, 6, 7, 8].includes(version)) throw new Error('Unsupported Yarn Berry lockfile metadata version');
    } else {
      if (!parseYarn) throw new Error('Yarn parser is unavailable');
      const parsed = parseYarn(text);
      if (parsed.type !== 'success') throw new Error('Malformed or conflicted Yarn Classic lockfile');
      rows = object(parsed.object);
    }
    for (const [key, raw] of Object.entries(rows)) {
      if (key === '__metadata') continue;
      const row = object(raw);
      const descriptors = key.split(/,\s*/);
      for (const descriptor of descriptors) {
        const match = descriptor.match(/^(@[^/]+\/[^@]+|[^@]+)@(.+)$/);
        if (!match) { warnings.add('Unrecognized Yarn descriptor; coverage is incomplete.'); continue; }
        if (berry && !match[2]!.startsWith('npm:')) { warnings.add('Yarn workspace/patch/non-npm protocols are not scanned.'); continue; }
        add(match[1]!, row.version, descriptor, dev.has(match[1]!));
      }
    }
    warnings.add('Yarn direct/development classification is name-based; multiple versions may share the classification.');
  } else throw new Error('Unsupported lockfile');
  const resolvedNames = new Set([...output.values()].map((dep) => dep.name));
  for (const name of direct) if (!resolvedNames.has(name)) warnings.add(`Direct dependency ${name} has no resolved registry version in the lockfile.`);
  return { dependencies: [...output.values()], warnings: [...warnings] };
}
