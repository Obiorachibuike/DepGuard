# Publishing and versioning DepGuard

## Current identity and scope ownership

This repository produces **both** the `depguard` CLI and a reusable library from the **root** package, `@depguard/core@0.1.0`. `website/` is a private workspace and must never be published. `files` is an allowlist: built ESM/CommonJS/CLI code and declarations, package metadata, README, LICENSE, SECURITY and CHANGELOG. Source maps include source text intentionally; tests, website, examples, workflows and local secrets are not shipped.

Nothing in this guide means a publication has occurred. No npm credentials are stored in the repository or GitHub Actions workflows.

The unscoped `depguard` package is already registered by an unrelated publisher. Do not publish to or assume control of it. `@depguard/core` requires ownership/membership and write permission in the **npm** `depguard` scope; GitHub ownership does not grant that permission. A registry 404 does not reserve a name or demonstrate scope ownership.

Before the first release, choose one:

1. Create/control the `depguard` npm organization and use `@depguard/core`; or
2. Change the root name to `@YOUR_NPM_SCOPE/depguard` (a scope you actually control). Update README/API imports, website install commands/links, publishing docs and the lockfile using `npm install --package-lock-only`.

Keep `bin.depguard` unchanged. Do not rename the package after publication without a migration plan. The workflow reads the package name dynamically.

## Manual setup: GitHub

1. Review and merge the implementation/release preparation PR into `main`. Release commits must be reachable from `origin/main`; the release workflow enforces this.
2. Enable Actions for this repository. It must remain public for npm provenance from GitHub.
3. Create an environment named **`npm`**, with required reviewer approval if your GitHub plan supports it. Permit the intended release tags (for example `v*`) under the environment deployment policy; a policy allowing only the `main` branch will block a tag-triggered release.
4. Protect `main` and release tags with rulesets/review. Restrict who can create or edit releases/tags and approve the `npm` environment. Do not move a published version's tag.
5. Keep the workflow at **`.github/workflows/publish.yml`**. Renaming it or transferring the repository requires reconfiguring the npm trust relationship.
6. Do **not** add `NPM_TOKEN` or `NODE_AUTH_TOKEN` secrets. The publish job requests `id-token: write`; other jobs only get `contents: read`. Built tarballs move between jobs using an immutable workflow artifact.

## Manual setup: npm trusted publisher

On npmjs.com, once you can open this package's **Settings → Trusted publishing**, add a GitHub Actions publisher with these exact values:

| Field                    | Value                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub organization/user | `Obiorachibuike`                                                                                                                                  |
| Repository               | `DepGuard`                                                                                                                                        |
| Workflow filename        | `publish.yml` (filename only, not the full path)                                                                                                  |
| Environment              | `npm`                                                                                                                                             |
| Allowed action           | Enable direct **`npm publish`** if the settings expose action permissions. A staged-publish-only authorization is insufficient for this workflow. |

Current npm documentation states trusted publishing needs **npm CLI 11.5.1+ and Node 22.14+** and a supported hosted runner. This workflow uses GitHub-hosted Ubuntu, Node 24, and npm 11. It publishes with provenance; it does not use `npm login`, tokens, reusable workflows, or self-hosted runners. Keep `repository.url` pointed at this exact GitHub repository.

New publisher configurations may expire if not validated by a successful publish within the time window shown by npm (currently documented as 2 days). Configure trust close to the next **new-version** release. An already-existing, byte-identical version is skipped by this workflow and does **not** validate an OIDC publication. If the trust expires, delete/recreate it before the next new-version release. After OIDC works, restrict traditional token publishing and revoke unused automation tokens in npm settings.

References (review these if npm's UI changes):

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub release events](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#release)

## Exact steps for the first version

npm's usual trusted-publisher configuration is **package-level**. If the package does not yet exist and npm does not offer a first-publication trust setup in your account, bootstrap it once locally. Do not expect OIDC to create a package whose trust relationship cannot yet be configured.

### 1. Confirm identity and reviewed source

Confirm scope ownership above. Merge the reviewed PR first and work from the exact reviewed release commit. Do not release an unreviewed branch or a dirty working tree. Use Node 24 and npm 11 for parity with CI:

```bash
node --version
npm --version
npm install --global npm@11
npm ci
npm run check
npm run docs:api
npm audit --audit-level=high
npm pack --dry-run
```

`npm run check` formats nothing: it checks formatting/lint/types, rebuilds and runs tests, validates an actual tarball in clean ESM/CommonJS/TypeScript consumers, and builds the website. Fix every failure before continuing. Ordinary tests do not need OSV access; the separate live integration check is optional.

### 2. Build the exact first-release tarball

```bash
npm pack
```

With the unchanged name/version, this creates `depguard-core-0.1.0.tgz`. Inspect the listed files and do not commit the archive. If the name changed, use the actual filename reported by npm.

### 3. Bootstrap only if required

Perform this **in your own terminal**, not in chat, source code, or GitHub Actions:

```bash
npm login
npm whoami
npm publish ./depguard-core-0.1.0.tgz --access public --ignore-scripts
npm view @depguard/core@0.1.0 version dist.integrity
```

Use your real package name/archive if renamed. Complete browser/2FA prompts privately. Never send tokens or OTPs to an agent or paste them into a workflow. A local bootstrap generally lacks the GitHub OIDC provenance of later CI releases; do not claim otherwise. Only a successful `npm publish` and registry lookup establish that the package was published.

If npm supports configuring trust before the initial publication for your account, configure it instead and proceed to step 4 without the local publish. No such account capability has been verified for this repository.

### 4. Configure npm trust and GitHub environment

Apply the exact setup tables above. On GitHub, create a Release with tag **`v0.1.0`** targeting the reviewed commit on `main`; publish the Release, not merely a Git tag or a draft. Stable versions must not be marked as prereleases.

The workflow checks that tag/version match, verifies the reviewed commit, runs all checks, and packs the release. If the bootstrap already published the **same integrity**, it explicitly reports no publication performed. If that version exists with different contents, it refuses to replace it: bump the version and create a new Release. If the package was not bootstrapped and npm trust is available, this is where the first OIDC publication will be attempted.

### 5. Validate an actual OIDC publication

If `0.1.0` was bootstrapped locally, prepare **`0.1.1`** through a reviewed PR, then publish GitHub Release `v0.1.1`. This new version exercises the OIDC publisher and validates the trust configuration. Set it up within npm's allowed validation window. Approve the `npm` environment job if required. A workflow that only skipped `0.1.0` has **not** demonstrated successful OIDC publishing.

### 6. Verify from an independent consumer

After the Actions run reports a successful publication:

```bash
npm view @depguard/core version dist.integrity dist.attestations
# In a separate example project:
npm install --save-dev @depguard/core
npx depguard --version
npx depguard scan --help
```

Inspect the package's npm provenance link, GitHub Release and Actions logs. Update release-status wording in README/website only after the registry confirms publication. Do not interpret an unchanged existing-version skip as a new publish.

## Subsequent versioning and releases

Use Semantic Versioning. Public API/report breaking changes must be called out explicitly; while below 1.0, minor versions may carry documented breaking changes, patches should remain compatible. Keep the private website version independent.

Prepare the version in a PR; do not tag before review:

```bash
npm version patch --no-git-tag-version
# Alternatives: minor, major, or prerelease --preid=beta
```

Update `CHANGELOG.md`, README examples and the CLI/report tool version where relevant. CLI and SARIF tool versions are checked against the root manifest by tests. Commit the root `package.json`, `package-lock.json`, changelog and version references. Run `npm run check`. Merge the PR; then create and publish a GitHub Release tagged exactly `v<package.json version>` at that reviewed commit.

- Stable versions publish under `latest`.
- Versions with prerelease identifiers (e.g. `0.2.0-beta.0`) require the GitHub prerelease flag and publish under `next`.
- `release: published` handles both stable and prerelease publication. Drafts and tag pushes alone do not publish.
- A new npm version cannot overwrite an existing version. Byte-identical reruns are safe no-ops; differing bytes require a version bump. Do not unpublish just to reuse a version.
- The workflow fails closed on registry errors other than an explicit 404. Do not work around network/authentication failures by introducing a token.

## Failure recovery

| Symptom                      | Check                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E404` / permission denied   | Exact package scope/name; membership/write rights; first-package bootstrap requirement.                                                                  |
| `ENEEDAUTH` / OIDC rejection | npm 11.5.1+, Node 22.14+, exact owner/repo/workflow/environment names, allowed direct publish action, unexpired trust, `id-token: write`, hosted runner. |
| Waiting for environment      | Approve `npm`; ensure tag deployments are allowed by its policy.                                                                                         |
| Release tag mismatch         | Tag must be `v` plus the root version; prerelease flag must match. Do not interpolate release metadata into shell scripts.                               |
| Commit not on main           | Merge and review before releasing; choose that commit.                                                                                                   |
| Existing different integrity | Do not overwrite or move the tag; prepare a new version and release.                                                                                     |
| Runtime files absent         | Run `npm run build`, `npm run test:package`, `npm pack --dry-run`; check the root `files` and `exports`.                                                 |
| Website check failed         | Fix the private workspace too; release validation intentionally runs the full repository checks.                                                         |

The npm account, scope permissions, GitHub environment protection and trusted-publisher relationship must be configured by the owner; this agent has not configured or authenticated an npm account and has not published the package.
