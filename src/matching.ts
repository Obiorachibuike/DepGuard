import semver from 'semver';
import { validPackageName } from './security.js';
import type { Advisory, AdvisoryRange, Dependency, PackageManager, Remediation } from './types.js';

function inRange(version: string, range: AdvisoryRange): boolean | undefined {
  if (range.type !== 'SEMVER') return undefined;
  let introduced: string | undefined;
  let found = false;
  for (const event of range.events) {
    if (event.introduced !== undefined) {
      if (event.introduced !== '0' && !semver.valid(event.introduced)) return undefined;
      introduced = event.introduced;
    }
    const end = event.fixed ?? event.last_affected ?? event.limit;
    if (end !== undefined) {
      if (!semver.valid(end) || introduced === undefined) return undefined;
      const above = introduced === '0' || semver.gte(version, introduced);
      const below = event.last_affected ? semver.lte(version, end) : semver.lt(version, end);
      found ||= above && below;
      introduced = undefined;
    }
  }
  if (introduced !== undefined) found ||= introduced === '0' || semver.gte(version, introduced);
  return found;
}
/** Unknown indicates the advisory has unsupported or malformed range semantics. */
export function isAffected(advisory: Advisory, dependency: Pick<Dependency, 'name' | 'version'>): boolean | undefined {
  if (advisory.withdrawn) return false;
  if (!semver.valid(dependency.version)) return undefined;
  let unknown = false;
  for (const entry of advisory.affected.filter((a) => a.name === dependency.name)) {
    if (entry.versions.includes(dependency.version)) return true;
    if (!entry.versions.length && !entry.ranges.length) unknown = true;
    for (const range of entry.ranges) {
      const matches = inRange(dependency.version, range);
      if (matches === true) return true;
      if (matches === undefined) unknown = true;
    }
  }
  return unknown ? undefined : false;
}
export function updateCommand(manager: PackageManager, dependency: Dependency, version: string): string {
  if (!validPackageName(dependency.name) || !semver.valid(version)) throw new Error('Invalid update command input');
  const spec = `${dependency.name}@${version}`;
  const dev = dependency.dev ? ' -D' : '';
  if (manager === 'npm') return `npm install${dev} -- ${spec}`;
  return `${manager} add${dev} -- ${spec}`;
}
/** A suggested version must be a stated fix and clear every known advisory for this package. */
export function remediation(dependency: Dependency, advisories: Advisory[], manager: PackageManager): Remediation {
  const candidates = [...new Set(advisories.flatMap((advisory) => advisory.affected.filter((a) => a.name === dependency.name).flatMap((a) => a.ranges.filter((r) => r.type === 'SEMVER').flatMap((r) => r.events.flatMap((e) => e.fixed ? [e.fixed] : [])))))];
  const fixed = candidates.filter((v) => semver.valid(v) && semver.gt(v, dependency.version) && advisories.every((a) => isAffected(a, { ...dependency, version: v }) === false)).sort(semver.compare)[0];
  if (!fixed) return { explanation: 'No verified forward patched version is available in the returned advisory data. Review the advisory and consider replacing or removing this dependency.' };
  const major = semver.major(fixed) !== semver.major(dependency.version);
  if (!dependency.direct) return { version: fixed, explanation: `Advisory data identifies ${fixed} as a fixed candidate. Update the parent dependency or review package-manager overrides; do not add this transitive dependency as a new direct dependency.${major ? ' A major-version change may be required.' : ''}` };
  return { version: fixed, command: updateCommand(manager, dependency, fixed), explanation: `Advisory data identifies ${fixed} as a fixed candidate across the returned advisories, not a guarantee of overall safety. Review compatibility and run your tests.${major ? ' This crosses a major version.' : ''} Running this command is an explicit user action and may execute package-manager lifecycle scripts.` };
}
