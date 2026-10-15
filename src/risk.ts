import type { Config } from './config.js';
import type { Finding, Severity } from './types.js';
export const severityRank: Record<Severity, number> = { unknown: 0, low: 1, moderate: 2, high: 3, critical: 4 };
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => Number(!!a.ignored) - Number(!!b.ignored) || Number(b.kind === 'vulnerability') - Number(a.kind === 'vulnerability') || severityRank[b.severity] - severityRank[a.severity] || Number(b.dependency.direct) - Number(a.dependency.direct) || a.dependency.name.localeCompare(b.dependency.name) || a.id.localeCompare(b.id));
}
export function filterFindings(findings: Finding[], severity: Severity): Finding[] {
  // Unknown known-vulnerability severity is never silently filtered out.
  return findings.filter((f) => severityRank[f.severity] >= severityRank[severity] || (f.kind === 'vulnerability' && f.severity === 'unknown'));
}
export function applyIgnores(findings: Finding[], rules: Config['ignore'], now: number): Finding[] {
  return findings.map((finding) => {
    const ids = [finding.id, ...(finding.advisory?.aliases ?? [])];
    const rule = rules.find((rule) => ids.includes(rule.id) && (!rule.package || rule.package === finding.dependency.name) && Date.parse(rule.expires) > now);
    return rule ? { ...finding, ignored: { reason: rule.reason, expires: rule.expires } } : finding;
  });
}
