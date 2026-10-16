import type { Finding, ScanReport } from '../types.js';
import { sanitize } from '../security.js';
export type ReportFormat = 'terminal' | 'json' | 'markdown' | 'sarif';
export interface ReportOptions {
  findings?: Finding[];
}
const caveat =
  'No known findings is not proof of safety. Coverage depends on resolved versions, advisory sources and available metadata.';
function safeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
function markdown(value: string): string {
  return sanitize(value)
    .replace(/[\\`*_{}[\]()#+.!|<>]/g, '\\$&')
    .replace(/\r?\n/g, ' ');
}
export function renderReport(
  report: ScanReport,
  format: ReportFormat = 'terminal',
  options: ReportOptions = {},
): string {
  const findings = options.findings ?? report.findings;
  let text: string;
  if (format === 'json')
    text = JSON.stringify({ ...report, findings }, null, 2);
  else if (format === 'sarif')
    text = JSON.stringify(toSarif(report, findings), null, 2);
  else if (format === 'markdown') {
    text = `# DepGuard report: ${markdown(report.project.name)}\n\nGenerated: ${report.generatedAt}\n\n${report.summary.dependencies} dependencies · ${report.summary.vulnerabilities} vulnerabilities · ${report.summary.warnings} health warnings · ${report.summary.ignored} ignored\n\nAdvisory coverage: **${report.coverage.advisory}** (${report.coverage.checked}/${report.coverage.total}); metadata: **${report.coverage.metadata}**.\n\n> ${caveat}\n\n`;
    for (const f of findings)
      text += `## ${markdown(f.id)} — ${markdown(f.dependency.name)}@${markdown(f.dependency.version)}\n\n**${f.severity} · ${f.kind}${f.ignored ? ' · ignored' : ''}**\n\n${markdown(f.title)}\n\n${markdown(f.explanation)}\n\n${f.evidence.map((e) => `- ${markdown(e)}`).join('\n')}\n\n${f.remediation ? `${markdown(f.remediation.explanation)}\n\n${f.remediation.command ? `\`${markdown(f.remediation.command)}\`\n\n` : ''}` : ''}${f.ignored ? `Ignored until ${f.ignored.expires}: ${markdown(f.ignored.reason)}\n\n` : ''}`;
    if (report.project.warnings.length || report.diagnostics.length)
      text += `## Coverage notes\n\n${[...report.project.warnings, ...report.diagnostics.map((d) => `${d.source}${d.package ? ` / ${d.package}` : ''}: ${d.message}`)].map((w) => `- ${markdown(w)}`).join('\n')}\n`;
  } else {
    text = `\n  DEPGUARD / dependency intelligence\n\n  ${report.project.name} · ${report.project.manager} · ${report.summary.dependencies} resolved dependencies\n  ${report.summary.vulnerabilities} vulnerabilities · ${report.summary.warnings} health warnings · ${report.summary.ignored} ignored\n  Advisory coverage: ${report.coverage.advisory} (${report.coverage.checked}/${report.coverage.total}) · metadata: ${report.coverage.metadata}\n\n`;
    for (const f of findings)
      text += `  ${f.severity.toUpperCase()}  ${f.dependency.name}@${f.dependency.version}  [${f.id}]${f.ignored ? ' (ignored)' : ''}\n  ${f.title}\n  ${f.explanation}\n${f.remediation ? `  → ${f.remediation.explanation}\n${f.remediation.command ? `    ${f.remediation.command}\n` : ''}` : ''}${f.ignored ? `  Ignored: ${f.ignored.reason} (expires ${f.ignored.expires})\n` : ''}\n`;
    if (!findings.length) text += '  No findings in this view.\n\n';
    for (const warning of report.project.warnings) text += `  ! ${warning}\n`;
    for (const d of report.diagnostics)
      text += `  ! ${d.source}${d.package ? ` / ${d.package}` : ''}: ${d.message}\n`;
    text += `\n  ${caveat}\n  Exit code: ${report.exitCode}\n`;
  }
  // Preserve JSON escaping by sanitizing before serialization, not the serialized JSON string.
  if (format === 'json' || format === 'sarif')
    return JSON.stringify(
      JSON.parse(text),
      (_k, v: unknown) => (typeof v === 'string' ? sanitize(v) : v),
      2,
    );
  return sanitize(text);
}
export function toSarif(
  report: ScanReport,
  findings = report.findings,
): unknown {
  const unique = [...new Map(findings.map((f) => [f.id, f])).values()];
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'DepGuard',
            version: '0.1.0',
            informationUri: 'https://github.com/Obiorachibuike/DepGuard',
            rules: unique.map((f) => ({
              id: f.id,
              shortDescription: { text: sanitize(f.title) },
              ...(f.advisory && safeUrl(f.advisory.url)
                ? { helpUri: safeUrl(f.advisory.url) }
                : {}),
              properties: {
                tags: [f.kind],
                ...(f.kind === 'vulnerability' && f.severity !== 'unknown'
                  ? {
                      'security-severity': {
                        critical: '9.5',
                        high: '8.0',
                        moderate: '5.0',
                        low: '2.0',
                      }[f.severity],
                    }
                  : {}),
              },
            })),
          },
        },
        invocations: [
          {
            executionSuccessful: report.exitCode !== 2,
            toolExecutionNotifications: [
              ...report.project.warnings.map((message) => ({
                level: 'warning',
                message: { text: message },
              })),
              ...report.diagnostics.map((d) => ({
                level: 'warning',
                message: { text: `${d.source}: ${d.message}` },
              })),
            ],
          },
        ],
        results: findings.map((f) => ({
          ruleId: f.id,
          level:
            f.severity === 'critical' || f.severity === 'high'
              ? 'error'
              : f.severity === 'low'
                ? 'note'
                : 'warning',
          message: {
            text: `${f.dependency.name}@${f.dependency.version}: ${sanitize(f.title)}. ${sanitize(f.explanation)}${f.remediation ? ` ${sanitize(f.remediation.explanation)}` : ''}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: report.project.lockfile ?? 'package.json',
                },
              },
              logicalLocations: [
                {
                  fullyQualifiedName: `${f.dependency.name}@${f.dependency.version}`,
                  kind: 'module',
                },
              ],
            },
          ],
          ...(f.ignored
            ? {
                suppressions: [
                  {
                    kind: 'external',
                    justification: sanitize(f.ignored.reason),
                    status: 'accepted',
                  },
                ],
              }
            : {}),
          properties: {
            severity: f.severity,
            kind: f.kind,
            direct: f.dependency.direct,
            evidence: f.evidence,
            remediation: f.remediation,
          },
        })),
        properties: {
          coverage: report.coverage,
          summary: report.summary,
          disclaimer: caveat,
        },
      },
    ],
  };
}
