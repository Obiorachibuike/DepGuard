# DepGuard

**Know Your Dependencies. Secure Your Software.**

DepGuard is a read-only dependency security toolkit for JavaScript and TypeScript projects: a `depguard` CLI **and** an ESM/CommonJS library with TypeScript declarations. It matches resolved versions against OSV advisories, reports npm registry health signals, and explains remediation without modifying the scanned project.

> **Release status:** `0.1.0` is prepared for a first publication, but has not been published by this project. `@obiorachibuike/depguard` is the configured name; the personal npm scope was selected from the supplied username `obiorachibuike`. Before publishing, verify that `npm whoami` returns `obiorachibuike`; the username alone is not authentication. The unrelated unscoped `depguard` name is already registered. Use the local tarball instructions until publication is confirmed. No finding is not proof of safety.

## Install from this repository today

Use Node **22.14+ (22.x) or Node 24+** for development (Vitest 5 requires a modern Node runtime). The built core supports Node **20.19+**; the website and test tooling have separate requirements.

```bash
git clone https://github.com/Obiorachibuike/DepGuard.git
cd DepGuard
# Until merged, use the implementation branch shown in PR #1.
npm ci
npm run build
npm test
npm run test:package
npm pack
```

`npm pack` creates `obiorachibuike-depguard-0.1.0.tgz`. Install it in the project you want to analyze:

```bash
npm install --save-dev /absolute/path/to/DepGuard/obiorachibuike-depguard-0.1.0.tgz
npx depguard scan .
```

These are explicit installation steps **you** run. The scanner itself never installs a scanned project's dependencies or runs its scripts.

### Once published under the configured name

```bash
npm install --save-dev @obiorachibuike/depguard
npx depguard scan .

# Optional global CLI installation:
npm install --global @obiorachibuike/depguard
depguard --help
```

If the publisher changes the npm scope, substitute the actual package name in installation commands and API imports. The executable remains `depguard`.

## What it does

- Discovers a manifest and resolves direct/transitive versions from supported lockfiles.
- Queries OSV for npm advisories; checks SEMVER events and explicit affected versions locally.
- Separates known vulnerabilities from outdated, deprecated, release-inactivity and missing-metadata findings.
- Suggests fixed candidates from advisory data, with npm/pnpm/Yarn commands for direct dependencies; advises parent updates for transitive dependencies.
- Produces terminal, JSON, Markdown and SARIF 2.1.0 reports.
- Supports strict JSON configuration, severity thresholds, expiring ignore rules, bounded concurrency, timeouts and an expiring disk cache.
- Does not inspect application reachability, detect malware, or guarantee dependency safety.

## CLI quick start

```bash
npx depguard scan
npx depguard scan /path/to/project --json
npx depguard scan --format markdown --output report.md
npx depguard scan --format sarif --output depguard.sarif
npx depguard scan --severity moderate --min-severity low --sort package
npx depguard scan --lockfile pnpm-lock.yaml
npx depguard scan --offline --no-health
npx depguard outdated
npx depguard explain coverage
npx depguard explain remediation
npx depguard explain GHSA-35jh-r3h4-6jhm
npx depguard init
```

| Command / option                                      | Behavior                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scan [path]`                                         | Analyze resolved dependencies; defaults to the current directory.                                                                                            |
| `outdated [path]`                                     | Show health findings from a full scan. Underlying vulnerability/coverage exit semantics still apply.                                                         |
| `explain [topic]`                                     | Explain vulnerability, outdated, maintenance, metadata, severity, coverage or remediation. Advisory IDs print a source link, not fabricated fetched details. |
| `init [path]`                                         | Create `.depguardrc.json`; never overwrite an existing file.                                                                                                 |
| `--json` / `--format terminal\|json\|markdown\|sarif` | Choose report output. `--json` takes precedence.                                                                                                             |
| `--config <file>`                                     | JSON configuration path relative to the explicit project directory.                                                                                          |
| `--severity <level>`                                  | CI failure threshold; default `high`.                                                                                                                        |
| `--min-severity <level>`                              | Filter displayed findings only; never changes underlying exit status or summary.                                                                             |
| `--sort risk\|package`                                | Default: vulnerabilities first, then severity and directness; ignored findings last.                                                                         |
| `--offline`                                           | Use only unexpired cached service responses. A miss is incomplete, not a clean result.                                                                       |
| `--no-health`                                         | Disable npm metadata checks.                                                                                                                                 |
| `--output <file>`                                     | Write to a **new** file; existing files are not overwritten.                                                                                                 |
| `--help`, `--version`                                 | Show available arguments or version.                                                                                                                         |

Valid severities are `unknown`, `low`, `moderate`, `high`, `critical`. An active known vulnerability with unknown severity always meets the failure threshold.

### Exit codes

| Code | Meaning                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Scan complete within documented coverage; no active findings meet the configured threshold. **Not a safety certificate.** |
| `1`  | Active findings meet the threshold. Health warnings can also fail at a low enough threshold.                              |
| `2`  | Incomplete coverage or an operational/argument error. Takes precedence over code 1.                                       |

Service failures appear in `diagnostics`; malformed input/configuration rejects the API promise and prints a redacted CLI error. An ignore rule never hides a coverage failure.

## Supported package managers

| Format                             | Support and limitations                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| npm `package-lock.json` v1, v2, v3 | Resolved direct/transitive versions; installed locations and development flags.                                                     |
| pnpm lockfile v6–v9                | Registry versions, including peer-suffixed keys. Root importer directness; development classification only for direct dependencies. |
| Yarn Classic                       | Grouped descriptors and resolved versions. Direct/development classification is name-based when several versions exist.             |
| Yarn Berry metadata v4–v8          | `npm:` descriptors. Workspace, patch and other protocols are reported as unsupported. Same name-based classification caveat.        |
| Manifest without a lockfile        | Exact versions only; incomplete scan because transitive versions are unknown.                                                       |

Multiple lockfiles require explicit selection. `npm-shrinkwrap.json`, Bun lockfiles, non-registry dependencies, and full monorepo importer/parent-path reconstruction are not supported. Scan workspaces separately. Discovery reports skipped workspace entries instead of querying local workspace versions as public registry packages.

## Configuration

Create `.depguardrc.json` using `depguard init`, or supply `--config custom.json`. Configuration is JSON only; JS/TS configuration files are never imported.

```json
{
  "severity": "high",
  "offline": false,
  "health": true,
  "cacheTtlHours": 24,
  "timeoutMs": 10000,
  "concurrency": 6,
  "abandonmentDays": 730,
  "advisory": { "provider": "osv" },
  "ignore": [
    {
      "id": "REPLACE-WITH-A-REAL-ADVISORY-ID",
      "package": "example-package",
      "reason": "Document the review and compensating control here",
      "expires": "2026-12-01T00:00:00Z"
    }
  ]
}
```

Optional `lockfile` selects `package-lock.json`, `pnpm-lock.yaml` or `yarn.lock`. Optional `project` selects a subdirectory within the explicit project root. CLI settings override the loaded configuration; API `config` overrides replace top-level properties. Unknown configuration keys fail validation. Ignore rules match advisory IDs/aliases or health finding IDs, optionally scoped to a package; expired rules do not apply. Ignored findings remain visible with their reasons and expiration dates.

Health IDs: `DG-OUTDATED`, `DG-DEPRECATED`, `DG-INACTIVE`, `DG-METADATA`. Inactivity means no published npm release in the configured interval; it is **not** proof of abandonment. Repository activity is not currently queried.

## TypeScript API

```ts
import { scan, renderReport, type ScanReport } from '@obiorachibuike/depguard';

const report: ScanReport = await scan({
  path: './my-project',
  config: { severity: 'high', health: true },
});

console.log(renderReport(report, 'markdown'));
process.exitCode = report.exitCode;
```

CommonJS is supported too:

```js
const { scan } = require('@obiorachibuike/depguard');
scan({ path: '.' }).then((report) => console.log(report.summary));
```

Public modules include `discoverProject`, `parseLockfile`, `OsvProvider`, `HttpClient`, `FileCache`, `HealthAnalyzer`, `isAffected`, `remediation`, `filterFindings`, `sortFindings`, configuration schemas and report renderers. `scan` accepts custom `AdvisoryProvider[]`, cache, fetch transport and clock for deterministic integrations. Custom providers are trusted application code and must implement their own offline/network policy. Generate full API reference with `npm run docs:api` (`api-docs/`).

## Network, cache and security boundaries

OSV (`https://api.osv.dev/v1/query`) receives **package names and resolved versions**. The public npm registry (`https://registry.npmjs.org/<encoded-name>`) receives package names for health metadata. Private/internal package names may therefore be disclosed to those services unless you use offline mode or custom providers/transport. No manifest, lockfile, source code, `.npmrc`, environment secret or project file is uploaded. GitHub advisory identifiers may arrive via OSV; no direct authenticated GitHub API integration is used by the scanner.

The cache defaults to `~/.cache/depguard/v1/`, with hashed filenames, 24-hour expiration and best-effort private permissions. Offline mode does not use stale entries. `cacheTtlHours: 0` disables cache reads; remove the directory to clear stored responses. API callers can supply a `FileCache` with a different directory/TTL. Cache files are local advisory/registry data, not a signed authority; protect your account and cache directory.

Requests use HTTPS host allowlists, reject redirects, apply deadlines and a 5 MiB response cap. Files are bounded to 16 MiB, dependency entries to 50,000; YAML aliases are disabled. Lockfile locations are never used as paths to execute or load code. Terminal controls and common credential patterns are redacted. Redaction is defense-in-depth, not a guarantee arbitrary secrets are detectable. See [SECURITY.md](SECURITY.md).

## Troubleshooting

- **`E404` when installing `@obiorachibuike/depguard`:** this project may not yet be published, or its release name changed. Install the local tarball; verify the exact published name.
- **Ambiguous lockfiles:** pass `--lockfile package-lock.json` (or your intended format).
- **Exit 2 / rate limits / timeout:** inspect `coverage`, `diagnostics` and project warnings in `--json` output. Retry later, adjust `timeoutMs` up to 60,000, or use unexpired cached responses. No automatic retries are performed.
- **Offline miss:** first populate the cache with an explicit online scan. This environment may block OSV; that is a service-access limitation, not evidence of safety.
- **Large registry response:** packages with very large histories can exceed the 5 MiB cap. Disable health checks if appropriate; advisory coverage remains separate.
- **`EEXIST` writing output or init:** choose a new output filename or review the existing config; DepGuard intentionally does not overwrite it.
- **Build/test runtime error:** use Node 22.14+ (22.x) or 24+, run `npm ci`, then `npm test` (which rebuilds the CLI first).

## Contributing, CI and publishing

```bash
npm run check           # format, lint, types, tests, clean consumer checks, website build
npm run docs:api
npm audit --audit-level=high
npm pack --dry-run
npm run website:dev     # http://localhost:3000, binds 0.0.0.0
```

Ordinary tests use mocked advisory responses. `npm run test:integration` explicitly enables a live OSV check; internet access is required and it is not a CI/release prerequisite. Package-consumer checks download runtime dependencies from npm but never query advisories or run installation lifecycle scripts.

- [Publishing and versioning / exact first-release steps](docs/PUBLISHING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [MIT license](LICENSE)

`.github/workflows/ci.yml` verifies changes. `.github/workflows/publish.yml` validates a published GitHub Release, builds/tests without OIDC permissions, then publishes the verified tarball in a separate `npm` environment job using npm trusted publishing. **No npm token is stored or required by these workflows.** The first-ever package publication may need a local npm login bootstrap before package-level trusted publishing can be configured; follow the publishing guide.
