#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { scan } from './scanner.js';
import { defaultConfig, severitySchema } from './config.js';
import { filterFindings } from './risk.js';
import { renderReport, type ReportFormat } from './reporting/index.js';
import { safeError } from './security.js';
import type { Finding } from './types.js';

const program = new Command().exitOverride().name('depguard').description('Know Your Dependencies. Secure Your Software.').version('0.1.0');
function scanCommand(name: string, description: string) {
  return program.command(name).description(description)
    .argument('[path]', 'Project directory', '.')
    .option('--config <file>', 'JSON configuration file relative to project')
    .option('--lockfile <file>', 'Explicit package-lock.json, pnpm-lock.yaml or yarn.lock')
    .option('--format <format>', 'terminal, json, markdown or sarif', (value: string) => {
      if (!['terminal', 'json', 'markdown', 'sarif'].includes(value)) throw new InvalidArgumentError('Unsupported report format');
      return value as ReportFormat;
    }, 'terminal')
    .option('--json', 'Alias for --format json')
    .option('--severity <level>', 'CI failure threshold: unknown, low, moderate, high, critical', (v: string) => {
      const result = severitySchema.safeParse(v);
      if (!result.success) throw new InvalidArgumentError('Invalid severity');
      return result.data;
    })
    .option('--min-severity <level>', 'Filter displayed findings (does not change exit code)', (v: string) => {
      const result = severitySchema.safeParse(v);
      if (!result.success) throw new InvalidArgumentError('Invalid severity');
      return result.data;
    })
    .option('--sort <order>', 'risk (default) or package', (v: string) => {
      if (!['risk', 'package'].includes(v)) throw new InvalidArgumentError('Sort must be risk or package'); return v;
    }, 'risk')
    .option('--offline', 'Use only unexpired cached responses')
    .option('--no-health', 'Disable registry health checks')
    .option('--output <file>', 'Write report to a new file (never overwrite existing files)')
    .action(async (path: string, opts: Record<string, unknown>, command: Command) => {
      const config: Record<string, unknown> = {};
      for (const key of ['severity', 'offline', 'health', 'lockfile']) if (command.getOptionValueSource(key) === 'cli') config[key] = opts[key];
      if (name === 'outdated') config.health = true;
      const report = await scan({ path, configFile: opts.config as string | undefined, config });
      let findings: Finding[] = report.findings;
      if (name === 'outdated') findings = findings.filter((f) => f.kind === 'outdated' || f.kind === 'metadata' || f.kind === 'maintenance');
      if (opts.minSeverity) findings = filterFindings(findings, severitySchema.parse(opts.minSeverity));
      if (opts.sort === 'package') findings = [...findings].sort((a, b) => a.dependency.name.localeCompare(b.dependency.name));
      const text = renderReport(report, opts.json ? 'json' : opts.format as ReportFormat, { findings });
      if (opts.output) await writeFile(resolve(String(opts.output)), text + '\n', { flag: 'wx', mode: 0o600 });
      else process.stdout.write(text + '\n');
      // A filtered view never conceals a failure in the underlying scan.
      process.exitCode = report.exitCode;
    });
}
scanCommand('scan', 'Scan resolved dependencies for known vulnerabilities and health signals');
scanCommand('outdated', 'Display dependency health (full scan exit semantics still apply)');
program.command('init').description('Create a safe JSON configuration; never overwrite an existing file')
  .argument('[path]', 'Project directory', '.')
  .action(async (path: string) => {
    await writeFile(resolve(path, '.depguardrc.json'), JSON.stringify(defaultConfig, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log('Created .depguardrc.json. No project dependencies were changed.');
  });
program.command('explain').description('Explain finding categories, severity, coverage, remediation and exit codes')
  .argument('[topic]', 'vulnerability, outdated, maintenance, metadata, severity, coverage, remediation or an advisory ID', 'coverage')
  .action((topic: string) => {
    const topics: Record<string, string> = {
      vulnerability: 'A known advisory explicitly affects a resolved dependency version. This is not a claim about exploitability in your application. Review usage and the source advisory.',
      outdated: 'The installed version is below the npm latest tag. Outdated does not mean vulnerable. Review compatibility before updating.',
      maintenance: 'Deprecation is a publisher-provided fact. Inactivity is a configurable release-age heuristic, not proof of abandonment or maliciousness. Repository activity is not queried.',
      metadata: 'Package metadata could not be retrieved or interpreted. No dependency health claim is made. The scan is incomplete (exit 2).',
      severity: 'Advisory severity uses source labels or CVSS v3. Unsupported scores remain unknown. Unknown vulnerabilities always meet the CI threshold. Health warnings are separate from known vulnerabilities.',
      coverage: 'Exit 0: no active finding meets the threshold. Exit 1: threshold exceeded. Exit 2: incomplete scan or operational error (takes precedence). No known findings is not proof of safety. Missing lockfiles, unresolved dependencies, failed services and uninterpretable ranges reduce coverage.',
      remediation: 'Fixed candidates come from published advisory events and are checked against all returned affected advisories. Test compatibility; no guarantee is made about unreturned advisories. Transitive findings recommend updating a parent, not installing a new direct dependency. DepGuard never runs update commands.',
    };
    if (topics[topic]) console.log(topics[topic]);
    else if (/^(GHSA-[a-z0-9-]+|CVE-\d{4}-\d+|OSV-[a-zA-Z0-9-]+)$/.test(topic)) console.log(`Review https://osv.dev/vulnerability/${encodeURIComponent(topic)}\nRun depguard scan --json for installed-version evidence, ranges, aliases and remediation. No advisory data was fetched by this explain command.`);
    else throw new Error('Unknown explain topic; see depguard explain --help');
  });
program.configureOutput({ outputError: (text, write) => write(safeError(text)) });
program.exitOverride();
try { await program.parseAsync(); }
catch (error) {
  const code = (error as { code?: string }).code;
  if (code === 'commander.helpDisplayed' || code === 'commander.version') process.exitCode = 0;
  else { if (!code?.startsWith('commander.')) process.stderr.write(`DepGuard: ${safeError(error)}\n`); process.exitCode = 2; }
}
