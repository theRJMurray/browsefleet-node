# Contributing to the BrowseFleet Node SDK

Thanks for the PR. Read [`skill.md`](./skill.md) for the exact setup, run, test, and contribution commands.

## TL;DR

1. Read `skill.md`.
2. Fork, branch off `master`, run `npm run lint && npm run typecheck && npm test && npm run build`, commit with [Conventional Commits](https://www.conventionalcommits.org/), open a PR against `master`.
3. CI runs the same checks on Node 18, 20, and 22.

## What makes a good PR

- One logical change. If you are touching the public surface, update `skill.md` and `CHANGELOG.md` in the same PR.
- New behavior gets a test. Bug fixes get a regression test. We use `vitest`. Tests live at `tests/<area>.test.ts`.
- The SDK is a thin REST wrapper. We do not add features that the BrowseFleet server does not already expose. If the server gains a feature, update the SDK in the same PR series (server first, SDK second).
- No new runtime dependencies without discussion. The SDK ships zero runtime dependencies and relies on native `fetch` from Node 18+. If you need something else, file an Issue first.

## What we will not accept

- Reintroducing the billing / hosted-SaaS code paths removed during the OSS conversion.
- Telemetry or phone-home behavior. The SDK is silent.
- Breaking changes without a `BREAKING CHANGE:` Conventional Commit footer and a CHANGELOG entry explaining the migration path.

## Releases

Releases are automated via `release-please`. Merge `feat:` and `fix:` commits to `master`; the bot opens a release PR. Merging that PR cuts a tag, the GitHub Action publishes to npm with provenance.

## License

By submitting a contribution, you agree it is licensed under the [MIT License](./LICENSE), the same license as the rest of the project. No CLA.
