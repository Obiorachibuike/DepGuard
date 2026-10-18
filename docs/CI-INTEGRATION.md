# CI integration

The published package is `@obiorachibuike/depguard`; version 0.1.0 was verified on the public npm registry. Pin a reviewed version in CI (for example `npm install --save-dev @obiorachibuike/depguard@0.1.0`). You can also install a tarball built from reviewed source. The CLI executable is `depguard` for either installation method.

## Threshold scan

```bash
npx depguard scan --severity high --no-health
```

The health flag here deliberately narrows the scan to advisory intelligence. Omit it for registry-health analysis too. Exit 0 means no active threshold findings within documented coverage; 1 means findings; 2 means incomplete coverage or an error. An unknown known-vulnerability severity always meets the threshold.

## SARIF for code scanning

```bash
npx depguard scan --format sarif --output depguard.sarif
```

Use GitHub's `github/codeql-action/upload-sarif` action after generating the file, subject to your repository's code-scanning availability and `security-events: write` permission. Configure the upload step to run when findings produce exit 1 or incomplete coverage produces exit 2, without discarding the scan's failure status. Ensure a file exists first: malformed input errors may not produce a report. Never use `|| true` to make the security check silently pass.

## Cache and privacy

You may preserve an unexpired advisory cache, but treat cache entries as unsigned local data. Do not confuse offline cache misses with successful scans. Review whether your CI may disclose private/internal dependency identifiers to public OSV/npm services. Keep fork PR jobs separate from publishing permissions and never give scanning jobs npm publishing credentials.

## This repository's automation

`ci.yml` checks formatting, lint, types, deterministic tests, packed consumers, website production build, API docs and npm audit. A runtime matrix exercises the packed public package on the declared minimum Node runtime and newer LTS lines. Optional live OSV tests are not required by ordinary CI.

`publish.yml` runs on a published GitHub Release, validates the tag/version and reviewed commit, and publishes a verified tarball via OIDC in the protected `npm` environment. It does not use a stored npm token. See the publishing guide for first-package bootstrap and manual account/trust configuration.
