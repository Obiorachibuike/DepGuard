# Architecture

DepGuard is both a CLI and a reusable library. The root is the publishable npm package; `website/` is a private Next.js App Router workspace, not a scanner backend.

## Pipeline

1. `config.ts`: strict Zod-validated JSON; CLI/API overrides; ignore expiration and bounds.
2. `discovery.ts`: explicit real project root, manifest declarations, lockfile selection and ambiguity detection.
3. `parsers/`: bounded npm, pnpm and Yarn parsing into deduplicated name/version records with logical lockfile locations. No code imports or filesystem traversal from lockfile entries.
4. `http.ts` / `cache.ts`: fixed service allowlist, response/deadline bounds, expiring content-key cache. Cache keys use SHA-256; writes are atomic.
5. `advisories/osv.ts`: external response validation and normalization through the public `AdvisoryProvider` interface. Provider failures become coverage diagnostics.
6. `matching.ts`: npm SEMVER/explicit-version matching; withdrawn advisories excluded; unsupported/invalid intervals remain unknown. Remediation considers every returned advisory; it never runs commands.
7. `health.ts`: per-name npm request deduplication, installed/latest version comparison, publisher deprecation and measurable release age. Inactivity is labeled heuristic; repository activity is not queried.
8. `risk.ts` / `scanner.ts`: bounded workers, coverage accounting, ignore rules, priority sorting, summary and exit codes. Unknown vulnerabilities always survive severity filters. Coverage failures override threshold findings.
9. `reporting/`: terminal, escaped Markdown, JSON and SARIF 2.1.0 with coverage information and suppressions for ignored findings.
10. `cli.ts`: Commander arguments and command behavior, non-overwriting output, redacted errors, no scanning-project lifecycle actions.

`src/index.ts` exports the typed API and extension points. Custom providers implement `name` and `query(Dependency): Promise<Advisory[]>`. They are trusted caller-supplied code and must enforce their own offline/network policy. An empty provider list is an error, not a successful empty scan. Filesystem/config errors reject; per-dependency service errors return incomplete structured reports.

## Packaging

`tsup` emits `dist/index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, `cli.js` and source maps. One cleanup step precedes parallel builds to avoid output-deletion races. CLI output retains its Node shebang. Conditional exports point import/require consumers to matching declarations and code. Only runtime npm dependencies are external; website and development dependencies are not required to use the CLI/library.

`npm run test:package` packs, installs in an isolated directory with scripts disabled, exercises import/require, type-checks `.mts`/`.cts` consumers, scans an empty locked fixture offline and checks npm's executable link. Release jobs publish the exact verified archive after an integrity check. See [publishing](PUBLISHING.md).

## Scope boundaries

No full graph/parent-chain reconstruction, complete workspace resolution, malware classification, Git-range interpretation, CVSS v4 scoring, advisory completeness guarantee or reachability analysis is claimed. No results database or cloud account is required. External services and local input remain untrusted; see [security policy](../SECURITY.md).
