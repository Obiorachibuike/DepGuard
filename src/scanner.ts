import { resolve } from 'node:path';
import { FileCache } from './cache.js';
import { configSchema, loadConfig, type ConfigInput } from './config.js';
import { discoverProject } from './discovery.js';
import { HttpClient } from './http.js';
import { OsvProvider } from './advisories/osv.js';
import { HealthAnalyzer } from './health.js';
import { isAffected, remediation } from './matching.js';
import { applyIgnores, filterFindings, sortFindings } from './risk.js';
import { safeError, sanitize } from './security.js';
import type { AdvisoryProvider, Diagnostic, Finding, ScanReport } from './types.js';

export interface ScanOptions {
  path?: string;
  configFile?: string;
  config?: ConfigInput;
  providers?: AdvisoryProvider[];
  cache?: FileCache;
  /** Injectable transport for tests or controlled environments. */
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}
/** Analyze without installing dependencies, importing project code or running scripts. */
export async function scan(options: ScanOptions = {}): Promise<ScanReport> {
  const now = options.now ?? (() => Date.now());
  const start = resolve(options.path ?? '.');
  const config = configSchema.parse({ ...await loadConfig(start, options.configFile), ...options.config });
  const project = await discoverProject(resolve(start, config.project ?? '.'), config.lockfile);
  const cache = options.cache ?? new FileCache(undefined, config.cacheTtlHours * 3_600_000, now);
  const http = new HttpClient({ cache, offline: config.offline, timeoutMs: config.timeoutMs, fetch: options.fetch });
  const providers = options.providers ?? [new OsvProvider(http)];
  if (!providers.length) throw new Error('At least one advisory provider is required');
  const health = new HealthAnalyzer(http, config.abandonmentDays, now);
  const findings: Finding[] = []; const diagnostics: Diagnostic[] = [];
  let advisoryChecks = 0; let metadataChecks = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < project.dependencies.length) {
      const dependency = project.dependencies[cursor++]!;
      const advisories = [];
      let complete = true;
      for (const provider of providers) {
        try {
          const result = await provider.query(dependency);
          for (const advisory of result) {
            const matches = isAffected(advisory, dependency);
            if (matches === true) advisories.push(advisory);
            else if (matches === undefined) {
              complete = false;
              diagnostics.push({ source: provider.name, package: dependency.name, message: `Could not interpret affected ranges for ${advisory.id}` });
            }
          }
        } catch (e) { complete = false; diagnostics.push({ source: provider.name, package: dependency.name, message: safeError(e) }); }
      }
      if (complete) advisoryChecks++;
      for (const advisory of [...new Map(advisories.map((a) => [a.id, a])).values()]) {
        findings.push({ id: advisory.id, kind: 'vulnerability', dependency, severity: advisory.severity, title: advisory.summary, explanation: 'The resolved version matches an affected range or explicit version in a published advisory. Actual exploitability depends on application usage; review the advisory.', evidence: [`Source advisory: ${advisory.id}`, `Resolved version: ${dependency.version}`, ...advisory.aliases], advisory, remediation: remediation(dependency, advisories, project.manager) });
      }
      if (config.health) {
        try { findings.push(...await health.analyze(dependency, project.manager)); metadataChecks++; }
        catch (e) {
          diagnostics.push({ source: 'npm registry', package: dependency.name, message: safeError(e) });
          findings.push({ id: 'DG-METADATA', kind: 'metadata', dependency, severity: 'unknown', title: `Metadata unavailable for ${dependency.name}`, explanation: 'Dependency health could not be assessed. This is not a safety assessment.', evidence: [safeError(e)] });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(config.concurrency, project.dependencies.length) }, worker));
  const all = sortFindings(applyIgnores(findings, config.ignore, now()));
  const total = project.dependencies.length;
  const resolutionIncomplete = project.warnings.some((w) => !w.startsWith('Yarn direct/development classification') && !w.startsWith('pnpm development classification'));
  const advisoryCoverage = advisoryChecks === total && !resolutionIncomplete ? 'complete' : advisoryChecks > 0 ? 'partial' : 'unavailable';
  const metadataCoverage = !config.health ? 'disabled' : metadataChecks === total ? 'complete' : 'partial';
  const active = all.filter((f) => !f.ignored);
  const incomplete = advisoryCoverage !== 'complete' || metadataCoverage === 'partial';
  const report: ScanReport = {
    schemaVersion: '1.0', generatedAt: new Date(now()).toISOString(), project, findings: all,
    diagnostics: diagnostics.sort((a, b) => `${a.source}${a.package}${a.message}`.localeCompare(`${b.source}${b.package}${b.message}`)),
    coverage: { advisory: advisoryCoverage, metadata: metadataCoverage, checked: advisoryChecks, total, sources: providers.map((p) => p.name), offline: config.offline },
    summary: { dependencies: total, direct: project.dependencies.filter((d) => d.direct).length, transitive: project.dependencies.filter((d) => !d.direct).length, vulnerabilities: active.filter((f) => f.kind === 'vulnerability').length, warnings: active.filter((f) => f.kind !== 'vulnerability').length, ignored: all.length - active.length, bySeverity: { unknown: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
    exitCode: incomplete ? 2 : filterFindings(active, config.severity).length ? 1 : 0,
  };
  for (const finding of active) report.summary.bySeverity[finding.severity]++;
  // Sanitize every string, including untrusted project names, lockfile locations and advisory text.
  return JSON.parse(sanitizeJson(report)) as ScanReport;
}
function sanitizeJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => typeof item === 'string' ? sanitize(item) : item);
}
