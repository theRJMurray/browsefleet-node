# Changelog

All notable changes to the BrowseFleet Node SDK are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the SDK adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- LICENSE (MIT), CODE_OF_CONDUCT.md (Contributor Covenant 2.1), SECURITY.md, CONTRIBUTING.md.
- `skill.md` at the repo root for AI coding agents.
- `.github/` issue and PR templates, CODEOWNERS, FUNDING placeholder, dependabot.
- `.editorconfig`, `.nvmrc`, `.gitattributes`.
- ESLint + Prettier + Vitest configs.
- Test suite under `tests/`.
- GitHub Actions: `ci.yml` (matrix Node 18/20/22), `release.yml` (release-please + npm publish with provenance), `skill-smoke.yml`, `pr-title.yml`.
- `tsup` for dual ESM + CJS + `.d.ts` output. `package.json` `exports` map covers both consumers.
- `src/version.ts` injected at build time so the SDK reports its own version in the `User-Agent` without a hard-coded string.

### Changed

- `baseUrl` defaults to `http://localhost:3000` (matching the typical self-hosted dev setup) instead of `https://api.browsefleet.com`. Operators set their own host. Also reads `BROWSEFLEET_URL` env var as a fallback.
- `apiKey` is now optional. The SDK omits the `x-api-key` header when no key is configured, matching the server's authless-by-default behavior.
- `User-Agent` header now includes the SDK version dynamically.
- `Authorization: Bearer` header replaced with `x-api-key` to match the BrowseFleet server's auth scheme.

### Removed

- `BillingAPI` class and all billing types (`CheckoutRequest`, `CheckoutResponse`, `PortalRequest`, `PortalResponse`, `BillingUsage`). The server's billing routes were removed during the OSS conversion (see the server repo's ADR-0001).

## [0.1.0] - 2026-04-02

Initial private release. Not published to npm.
