# Changelog

Changes follow Semantic Versioning. This file describes implemented source, not proof of publication.

## 0.1.0 — Unreleased

### Added

- ESM/CommonJS library, TypeScript declarations and a `depguard` CLI.
- npm v1–v3, pnpm v6–v9 and Yarn Classic/Berry registry dependency resolution.
- OSV advisory adapter, SEMVER matching, registry health analysis, prioritization and advisory-backed remediation guidance.
- JSON configuration, expiring ignore rules, offline cache, bounded HTTP requests and explicit coverage/exit statuses.
- Terminal, JSON, Markdown and SARIF reports.
- Mocked unit tests, optional live integration check, packed-package ESM/CommonJS/type/CLI consumer verification.
- Next.js documentation workspace and CI checks.
- Release-triggered npm OIDC workflow, integrity-checked package artifacts and first-release bootstrap documentation.

### Security

- No dependency installation, project code execution or automatic dependency changes during scans.
- File/root constraints, size/entry limits, disabled YAML aliases, response caps, timeouts, terminal sanitization and credential redaction.
- Unknown/malformed advisory ranges are incomplete, not clean. Fixed candidates are tested against all returned advisory records.

### Known limitations

No malware/reachability detection; no direct repository-activity queries; partial monorepo/protocol support; name-based Yarn directness; no OSV pagination traversal (pagination produces incomplete coverage); registry response caps can exclude very large package histories. See README and SECURITY for details.
