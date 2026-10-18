# Roadmap

This is a direction, not a promise of delivery dates or security coverage.

## Implemented in the 0.1.0 source

- Read-only npm, pnpm and Yarn registry-version discovery.
- OSV matching, registry health, expiring cache, explicit degraded coverage.
- CLI, typed library, terminal/JSON/Markdown/SARIF reports.
- Automated testing, clean-consumer packaging checks and release workflow preparation.

## Planned for evaluation

- Complete workspace/importer graphs and parent dependency paths.
- More precise Yarn direct/development classification.
- OSV pagination traversal and version-independent advisory queries for stronger candidate-update analysis.
- Additional advisory sources and CVSS v4 support.
- Optional authenticated private-registry metadata with a carefully documented privacy model.
- Optional repository activity indicators, kept separate from measurable release-age facts.
- More structured explain output and finer-grained report baselines.

## Non-goals

DepGuard will not silently install dependencies, execute package scripts, claim malware detection from maintenance heuristics, or replace application-specific exploitability review. No download counts, benchmark claims, certification or customer endorsements are asserted.
