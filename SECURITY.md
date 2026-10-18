# Security policy

DepGuard 0.1.x is an initial, pre-1.0 implementation, not a security certification. No independent audit or support SLA is claimed. Report issues against the current maintained source/version; fixes will be documented in the changelog.

## Reporting vulnerabilities

Use [GitHub private vulnerability reporting](https://github.com/Obiorachibuike/DepGuard/security/advisories/new) if enabled for this repository. If unavailable, contact the repository owner through GitHub to arrange a private reporting channel without posting exploit details or credentials publicly. Do not include real tokens, private lockfiles or customer data in public issues.

## Threat model

The scanner treats manifests, lockfiles, configuration and advisory text as untrusted data. It does not run lifecycle scripts, install dependencies, load project code, execute commands, import JS configuration, read `.npmrc`, or change scanned manifests/lockfiles. CLI `init` creates a new configuration only when explicitly invoked. `--output` creates a new report and refuses existing files. Suggested update commands are text only; running them manually may invoke package-manager scripts.

Project input is realpath-constrained to its explicit root, with no-follow protection on final file opens where supported, a 16 MiB input cap, a 50,000-entry cap, an npm-v1 nesting limit and no YAML alias expansion. Lockfile locations are labels, not filesystem paths. A malicious local process concurrently replacing ancestor directories, a compromised runtime/parser dependency, or an attacker with access to the user's cache/account is outside these protections. Scan actively hostile checkouts in a resource-limited container without secrets, and avoid concurrently mutated inputs.

External requests are HTTPS-only with fixed OSV/npm hosts, no redirects, default 10-second deadlines, 5 MiB response limits and bounded concurrency. Network/error messages omit response bodies and raw transport exceptions. Terminal escape sequences and common credential patterns are removed from public reports; Markdown syntax is escaped and SARIF help URLs are HTTPS-only. Redaction cannot identify every arbitrary secret: review reports before publishing them.

## Data egress

- `api.osv.dev/v1/query`: npm package names and exact resolved versions.
- `registry.npmjs.org/<encoded-name>`: package names, for release metadata.
- No project files, source code, config, environment variables or registry credentials are uploaded.
- Private/internal names may still be disclosed. Use offline mode with a prepopulated unexpired cache, or a reviewed custom provider/transport, when disclosure is unacceptable. Merely disabling health checks does not disable OSV queries.
- Custom API providers/transports execute as trusted application code and are responsible for their own network/offline restrictions.
- The scanner does not make direct authenticated GitHub requests; GitHub Advisory Database records may be supplied through OSV.

## Meaning of findings

Known advisories are distinct from health warnings. Source labels/CVSS v3 inform severity; uninterpretable severity is unknown, not low. Unsupported advisory ranges, rate limits, missing metadata, non-registry dependencies and unresolved versions reduce coverage. Exit 2 takes precedence; ignore rules never suppress failed coverage. Missing findings are not evidence of safety, maliciousness, exploitability or a complete advisory corpus.

Release-age warnings are transparent heuristics. No repository activity is queried. Fixed candidates are checked against returned advisory data, not a complete future-version risk assessment. Exact transitive parent paths and full monorepo semantics are not reconstructed.

## Cache and supply chain

The unsigned cache stores advisory/registry data under `~/.cache/depguard/v1`, with hashed keys, bounded entries, expiration, atomic writes and best-effort private file permissions. Expired/corrupt entries are cache misses; offline mode never treats misses as clean scans. It is not a tamper-proof security database. Delete the directory to clear it; total disk usage is not globally capped.

Maintainers should use reviewed source, lockfile installs, pinned workflow actions, environment approval and npm OIDC trusted publishing. Never commit credentials, publish from a fork without updating metadata/trust, or grant publishing permissions to pull-request validation. See [publishing instructions](docs/PUBLISHING.md).
