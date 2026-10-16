/** Severity is unknown when a source does not provide an interpretable rating. */
export type Severity = 'unknown' | 'low' | 'moderate' | 'high' | 'critical';
export type PackageManager = 'npm' | 'pnpm' | 'yarn';
export interface Dependency {
  name: string;
  version: string;
  direct: boolean;
  dev: boolean;
  /** Logical lockfile locations, never executable filesystem paths. */
  locations: string[];
}
export interface Project {
  root: string;
  name: string;
  manager: PackageManager;
  lockfile?: string;
  dependencies: Dependency[];
  warnings: string[];
}
export interface AdvisoryRange {
  type: 'SEMVER' | 'ECOSYSTEM' | 'GIT';
  events: {
    introduced?: string;
    fixed?: string;
    last_affected?: string;
    limit?: string;
  }[];
}
export interface Advisory {
  id: string;
  aliases: string[];
  summary: string;
  severity: Severity;
  url: string;
  affected: { name: string; versions: string[]; ranges: AdvisoryRange[] }[];
  withdrawn?: string;
}
/** Implement this interface to add a source. Throw on incomplete/failed responses. */
export interface AdvisoryProvider {
  readonly name: string;
  query(dependency: Dependency): Promise<Advisory[]>;
}
export interface Remediation {
  version?: string;
  command?: string;
  explanation: string;
}
export interface Finding {
  id: string;
  kind: 'vulnerability' | 'outdated' | 'maintenance' | 'metadata';
  dependency: Dependency;
  severity: Severity;
  title: string;
  explanation: string;
  evidence: string[];
  advisory?: Advisory;
  remediation?: Remediation;
  ignored?: { reason: string; expires: string };
}
export interface Diagnostic {
  source: string;
  package?: string;
  message: string;
}
export interface ScanReport {
  schemaVersion: '1.0';
  generatedAt: string;
  project: Project;
  findings: Finding[];
  diagnostics: Diagnostic[];
  coverage: {
    advisory: 'complete' | 'partial' | 'unavailable';
    metadata: 'complete' | 'partial' | 'disabled';
    checked: number;
    total: number;
    sources: string[];
    offline: boolean;
  };
  summary: {
    dependencies: number;
    direct: number;
    transitive: number;
    vulnerabilities: number;
    warnings: number;
    ignored: number;
    bySeverity: Record<Severity, number>;
  };
  /** 0: no threshold findings, 1: threshold findings, 2: incomplete scan. */
  exitCode: 0 | 1 | 2;
}
