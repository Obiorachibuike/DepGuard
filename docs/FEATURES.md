# Features

## Known vulnerability intelligence

The default OSV adapter validates responses and matches npm package versions against SEMVER events or explicit affected-version lists. Reports include source IDs, aliases, severity, affected ranges and available fixed candidates. Withdrawn records are excluded; uninterpretable data reduces coverage.

## Dependency health with context

Compare installed releases to npm latest tags, show publisher deprecation notices and measure time since the most recent published release. Maintenance warnings remain distinct from known vulnerabilities. Long release intervals do not prove abandonment, and repository activity is not currently queried.

## Practical remediation

Direct dependency findings can include package-manager-specific update commands with an explicit option boundary. Transitive findings recommend updating parents or reviewing overrides rather than introducing new direct dependencies. Candidates are checked against returned advisory records, not asserted to be risk-free. DepGuard does not run these commands.

## Work where you already work

Use the CLI locally, compose the typed API in tooling, or export terminal, JSON, Markdown and SARIF reports. Configure severity thresholds, ignored finding expiration, timeouts and concurrency. CI exit codes distinguish threshold findings from incomplete analysis.

## Read-only and inspectable

Project files are data, not executable configuration. HTTPS requests are bounded and service failures are visible. No cloud account is required. Online requests still disclose dependency identifiers to the documented services; use the security model to decide whether that is appropriate.
