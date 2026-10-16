# Frequently asked questions

## Does a clean scan mean my dependencies are safe?

No. DepGuard only reports what its available sources and supported resolution data establish. An empty advisory response is not a guarantee of safety. Unknown advisories, unavailable services, unsupported protocols and unreported vulnerabilities remain possible.

## Does it install anything or change my dependencies?

Not during a scan. Project scripts and JavaScript configuration are never loaded. `init` explicitly creates a configuration file; report output explicitly creates a new report. Update commands are suggestions for you to review and run yourself.

## Is outdated the same as vulnerable?

No. Outdated compares your installed version to npm's latest tag. Vulnerability findings require affected-version evidence from an advisory. Deprecation is a publisher signal, while release inactivity is a heuristic, not a claim of abandonment or maliciousness.

## Can I scan private dependencies?

Be aware that the default online scan queries public services with names and resolved versions. It does not authenticate to private registries. Use offline mode with an appropriately populated unexpired cache, or a reviewed custom provider/transport when disclosing internal names is unacceptable.

## Why do I get exit code 2 with vulnerability findings?

Incomplete coverage takes precedence over the finding threshold. Fix service access, unresolved versions, configuration or unsupported input first; do not treat a partial scan as a successful complete one. Ignore rules cannot hide coverage failures.

## Is the npm package live?

This repository prepares version 0.1.0 for publication but does not claim it has been published. Verify the actual package name and version on npm before relying on registry installation instructions. The local tarball installation path works independently of publication.

## Can I use it without a cloud account?

Yes. DepGuard needs no account and stores no project files in a hosted backend. Public OSV and npm services are used by default, and service access can still fail, time out or be rate-limited. Offline mode requires unexpired locally cached data.
