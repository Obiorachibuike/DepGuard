import semver from 'semver';
import { z } from 'zod';
import { HttpClient } from './http.js';
import type { Dependency, Finding, PackageManager } from './types.js';
import { updateCommand } from './matching.js';

const registrySchema = z.object({
  'dist-tags': z.object({ latest: z.string() }),
  time: z.record(z.string()).optional(),
  versions: z.record(z.object({ deprecated: z.string().optional() }).passthrough()),
});
export class HealthAnalyzer {
  private readonly requests = new Map<string, Promise<z.infer<typeof registrySchema>>>();
  constructor(private readonly http: HttpClient, private readonly abandonmentDays = 730, private readonly now = () => Date.now()) {}
  async analyze(dep: Dependency, manager: PackageManager): Promise<Finding[]> {
    let request = this.requests.get(dep.name);
    if (!request) {
      request = this.http.json(`https://registry.npmjs.org/${encodeURIComponent(dep.name)}`).then((raw) => registrySchema.parse(raw));
      this.requests.set(dep.name, request);
    }
    const data = await request;
    const findings: Finding[] = [];
    const latest = data['dist-tags'].latest;
    if (!semver.valid(latest) || !data.versions[dep.version]) throw new Error('Registry metadata is missing a valid latest or installed version');
    if (semver.gt(latest, dep.version)) findings.push({
      id: 'DG-OUTDATED', kind: 'outdated', dependency: dep, severity: 'low',
      title: `A newer release of ${dep.name} is available`,
      explanation: 'Being behind the npm latest tag is a version comparison, not evidence of a vulnerability. Check release notes before updating.',
      evidence: [`Installed: ${dep.version}`, `npm latest: ${latest}`],
      remediation: { version: latest, ...(dep.direct ? { command: updateCommand(manager, dep, latest) } : {}), explanation: dep.direct ? 'Review compatibility before updating; latest is not asserted to be vulnerability-free.' : 'Update the parent dependency or review overrides rather than adding a new direct dependency.' },
    });
    const deprecated = data.versions[dep.version]?.deprecated;
    if (deprecated) findings.push({ id: 'DG-DEPRECATED', kind: 'maintenance', dependency: dep, severity: 'moderate', title: `${dep.name}@${dep.version} is deprecated`, explanation: 'The publisher marked this version deprecated. This is a maintenance signal, not proof of maliciousness or a vulnerability.', evidence: [deprecated] });
    const releases = Object.entries(data.time ?? {}).filter(([key, date]) => !!semver.valid(key) && Number.isFinite(Date.parse(date)) && Date.parse(date) <= this.now()).sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]));
    const last = releases[0];
    if (last && (this.now() - Date.parse(last[1])) / 86_400_000 >= this.abandonmentDays) findings.push({
      id: 'DG-INACTIVE', kind: 'maintenance', dependency: dep, severity: 'low',
      title: `No recent published releases for ${dep.name}`,
      explanation: `Heuristic: no npm release in at least ${this.abandonmentDays} days. Stable packages may need few updates. This does not establish abandonment. Repository activity has not been queried.`,
      evidence: [`Most recent release: ${last[0]} on ${last[1]}`, `Published versions with timestamps: ${releases.length}`],
    });
    return findings;
  }
}
