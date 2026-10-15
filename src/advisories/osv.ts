import { z } from 'zod';
import { HttpClient } from '../http.js';
import type { Advisory, AdvisoryProvider, Dependency, Severity } from '../types.js';

const event = z.object({ introduced: z.string().optional(), fixed: z.string().optional(), last_affected: z.string().optional(), limit: z.string().optional() });
const osvSchema = z.object({ next_page_token: z.string().optional(), vulns: z.array(z.object({
  id: z.string().min(1), aliases: z.array(z.string()).default([]),
  summary: z.string().optional(), details: z.string().optional(), withdrawn: z.string().optional(),
  database_specific: z.object({ severity: z.string().optional() }).passthrough().optional(),
  severity: z.array(z.object({ type: z.string(), score: z.string() })).default([]),
  affected: z.array(z.object({
    package: z.object({ name: z.string(), ecosystem: z.string() }),
    versions: z.array(z.string()).default([]),
    ranges: z.array(z.object({ type: z.enum(['SEMVER', 'ECOSYSTEM', 'GIT']), events: z.array(event) })).default([]),
    ecosystem_specific: z.object({ severity: z.string().optional() }).passthrough().optional(),
    database_specific: z.object({ severity: z.string().optional() }).passthrough().optional(),
  })),
})).default([]) });

/** CVSS v3 base score. Unsupported score formats remain unknown, not low. */
export function cvssSeverity(vector: string): Severity {
  if (!/^CVSS:3\.[01]\//.test(vector)) return 'unknown';
  const m = Object.fromEntries(vector.split('/').slice(1).map((part) => part.split(':')));
  const value = (key: string, weights: Record<string, number>) => weights[m[key] ?? ''] ?? NaN;
  const changed = m.S === 'C';
  if (!['C', 'U'].includes(m.S ?? '')) return 'unknown';
  const impactBase = 1 - (1 - value('C', { N: 0, L: 0.22, H: 0.56 })) * (1 - value('I', { N: 0, L: 0.22, H: 0.56 })) * (1 - value('A', { N: 0, L: 0.22, H: 0.56 }));
  const impact = changed ? 7.52 * (impactBase - 0.029) - 3.25 * (impactBase - 0.02) ** 15 : 6.42 * impactBase;
  const exploit = 8.22 * value('AV', { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }) * value('AC', { L: 0.77, H: 0.44 }) * value('PR', { N: 0.85, L: changed ? 0.68 : 0.62, H: changed ? 0.5 : 0.27 }) * value('UI', { N: 0.85, R: 0.62 });
  const score = impact <= 0 ? 0 : Math.ceil((Math.min((changed ? 1.08 : 1) * (impact + exploit), 10) - 1e-10) * 10) / 10;
  if (!Number.isFinite(score)) return 'unknown';
  return score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'moderate' : score > 0 ? 'low' : 'unknown';
}
function severityOf(row: z.infer<typeof osvSchema>['vulns'][number]): Severity {
  const labels = [row.database_specific?.severity, ...row.affected.flatMap((a) => [a.ecosystem_specific?.severity, a.database_specific?.severity])];
  const known: Severity[] = labels.flatMap((label) => {
    const lower = label?.toLowerCase();
    return lower === 'medium' ? ['moderate'] : ['low', 'moderate', 'high', 'critical'].includes(lower ?? '') ? [lower as Severity] : [];
  });
  known.push(...row.severity.filter((s) => s.type === 'CVSS_V3').map((s) => cvssSeverity(s.score)));
  return known.sort((a, b) => ['unknown', 'low', 'moderate', 'high', 'critical'].indexOf(b) - ['unknown', 'low', 'moderate', 'high', 'critical'].indexOf(a))[0] ?? 'unknown';
}
export class OsvProvider implements AdvisoryProvider {
  readonly name = 'OSV';
  constructor(private readonly http = new HttpClient()) {}
  async query(dependency: Dependency): Promise<Advisory[]> {
    const result = osvSchema.parse(await this.http.json('https://api.osv.dev/v1/query', { package: { name: dependency.name, ecosystem: 'npm' }, version: dependency.version }));
    if (result.next_page_token) throw new Error('OSV returned paginated results; complete advisory coverage is unavailable');
    return result.vulns.map((row) => ({
      id: row.id, aliases: row.aliases, summary: row.summary ?? row.details?.slice(0, 300) ?? row.id,
      severity: severityOf(row), url: `https://osv.dev/vulnerability/${encodeURIComponent(row.id)}`,
      withdrawn: row.withdrawn,
      affected: row.affected.filter((a) => a.package.ecosystem === 'npm').map((a) => ({ name: a.package.name, versions: a.versions, ranges: a.ranges })),
    }));
  }
}
