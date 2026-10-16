# Lockfile examples

These are small discovery fixtures, not installed applications or current security assessments. Dependency versions were chosen to demonstrate format support, not to assert safety. Do not use the synthetic test advisories as real intelligence.

From a built repository:

```bash
node dist/cli.js scan examples/npm --no-health
node dist/cli.js scan examples/pnpm --json --no-health
node dist/cli.js scan examples/yarn --format markdown --no-health
```

Online commands query OSV with the package identifiers shown in these fixtures. With unavailable services they should return incomplete coverage (exit 2), not fabricated findings. `--offline` works only with unexpired cache entries. You never need to install example dependencies to scan the lockfiles.
