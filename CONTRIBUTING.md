# Contributing to DepGuard

Use Node 22.14+ (22.x) or Node 24 and npm. Run `npm ci`, `npm run format`, `npm run check`, `npm run docs:api` and `npm audit --audit-level=high` before requesting review. The packed-consumer check downloads runtime dependencies, but ordinary tests use deterministic advisory fixtures. `npm run test:integration` is optional and uses live OSV access.

Keep changes focused and preserve the CLI/public API. Add regression tests for behavior changes. Security findings require real advisory evidence; synthetic records belong only in clearly labeled fixtures. Never silently turn service failures into clean results, execute project code, install scanned dependencies, or commit secrets/generated build artifacts. Distinguish maintenance heuristics from known vulnerabilities.

The root package ships CLI and library builds; `website/` is private. `src/index.ts` is the public export surface. Run `npm run website:dev` for the docs site. API documentation is generated with TypeDoc and intentionally ignored in Git. See [architecture](docs/ARCHITECTURE.md).

Use the repository's GitHub issues for reproducible bugs, proposals and documentation corrections; avoid posting sensitive data. Follow [SECURITY.md](SECURITY.md) for vulnerability disclosures. Contributions are under the repository's MIT license. Maintainers must follow [publishing/versioning](docs/PUBLISHING.md), never add a publish token to a workflow, and never mark a release published without registry confirmation.
