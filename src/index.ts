export { scan, type ScanOptions } from './scanner.js';
export { discoverProject } from './discovery.js';
export { parseLockfile, type ParseResult } from './parsers/index.js';
export { OsvProvider, cvssSeverity } from './advisories/osv.js';
export { HttpClient, ServiceError, type HttpOptions } from './http.js';
export { FileCache } from './cache.js';
export {
  configSchema,
  defaultConfig,
  loadConfig,
  type Config,
  type ConfigInput,
} from './config.js';
export { isAffected, remediation, updateCommand } from './matching.js';
export { HealthAnalyzer } from './health.js';
export { filterFindings, sortFindings, severityRank } from './risk.js';
export {
  renderReport,
  toSarif,
  type ReportFormat,
  type ReportOptions,
} from './reporting/index.js';
export { sanitize } from './security.js';
export type * from './types.js';
