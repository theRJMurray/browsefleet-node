# Working in browsefleet-node with a coding agent

This file is read by AI coding agents that land in this repo (Claude Code, Cursor, Aider, etc.). It contains the exact setup, run, test, and contribution steps. Read it once; refer back on errors.

For human contributors, this file is also accurate and complete. No separate human onboarding doc.

## TL;DR for the impatient agent

```bash
git clone https://github.com/theRJMurray/browsefleet-node.git
cd browsefleet-node
npm install
npm run build
npm test
```

All three should succeed silently. If any fails, jump to "Known failure modes" below.

## Required tools and versions

| Tool    | Minimum             | Why                                                               |
| ------- | ------------------- | ----------------------------------------------------------------- |
| Node.js | 18 (22 recommended) | Native `fetch`, `FormData`, `ReadableStream`. Pinned in `.nvmrc`. |
| npm     | 9+                  | Bundled with Node 18+.                                            |

That is the entire toolchain. No native bindings, no Python, no Rust, no Chrome (the server is what runs Chrome; this SDK just talks to it over HTTP).

## First-time setup

```bash
git clone https://github.com/theRJMurray/browsefleet-node.git
cd browsefleet-node
nvm use   # if you have nvm; reads .nvmrc
npm install
```

Expected: ~5 to 15 seconds. There are no native modules.

## Running the project

This package is a library, not an app. There is no "run" step. The development loop is:

```bash
npm run build              # tsup: ESM + CJS + .d.ts + .d.cts into dist/
npm test                   # vitest run
npm run test:watch         # vitest watch
npm run typecheck          # tsc --noEmit
npm run lint               # eslint
npm run format             # prettier --write
```

To exercise the SDK against a real BrowseFleet server, see the examples below.

## Verifying it works (smoke test)

After `npm run build`, both module systems must resolve:

```bash
# ESM
node --input-type=module -e "import('./dist/index.js').then(m => console.log(typeof m.BrowseFleet))"
# expected: function

# CJS
node -e "const {BrowseFleet} = require('./dist/index.cjs'); console.log(typeof BrowseFleet)"
# expected: function
```

Then point the SDK at a running BrowseFleet server (see the [server repo](https://github.com/theRJMurray/browsefleet) for setup):

```bash
node --input-type=module -e "
import { BrowseFleet } from './dist/index.js';
const bf = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
console.log(await bf.health());
"
# expected: true
```

## Project layout

```
browsefleet-node/
├── src/
│   ├── index.ts        # public surface: BrowseFleet class + sub-APIs
│   ├── types.ts        # request / response interfaces (mirrors server types)
│   ├── errors.ts       # typed error classes
│   └── version.ts      # SDK_VERSION constant, replaced at build time
├── tests/              # vitest suite
├── examples/           # runnable mini-projects
├── tsup.config.ts      # bundler (dual ESM+CJS+types)
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── package.json
├── README.md
├── skill.md            # this file
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── LICENSE             # MIT
└── .github/            # issue templates, PR template, workflows, dependabot
```

## Common tasks

### Add a new method to mirror a new server endpoint

1. Add the request / response interfaces to `src/types.ts`. Mirror the server's `src/types.ts` exactly.
2. Add the method to the appropriate sub-API class in `src/index.ts` (`SessionsAPI`, `ProfilesAPI`, `AgentAPI`) or as a top-level method on `BrowseFleet`.
3. Add a test in `tests/sessions.test.ts` or wherever fits. The test pattern uses `vi.fn` against `globalThis.fetch` to capture call args.
4. `npm run build && npm test`.
5. Update `CHANGELOG.md`'s `[Unreleased]` section.

### Add a new typed error

1. Subclass `BrowseFleetError` in `src/errors.ts`.
2. Re-export from `src/index.ts` so consumers can `import { ... } from 'browsefleet'`.
3. Map the status code in `_buildError` in `src/index.ts`.
4. Add a test in `tests/errors.test.ts`.

### Bump the targeted Node version

1. Update `engines.node` in `package.json`.
2. Update `target` in `tsup.config.ts`.
3. Update `.nvmrc`.
4. Update the CI matrix in `.github/workflows/ci.yml`.

## Testing

```bash
npm test              # one shot
npm run test:watch    # watch
npm run test:coverage # v8 coverage report
```

The suite is fully offline. `globalThis.fetch` is replaced with `vi.fn` returning canned `Response` objects. No live server required.

New tests live at `tests/<area>.test.ts`. The convention is one test file per public sub-API or concern (client, sessions, errors, types).

## Linting and formatting

```bash
npm run lint          # eslint flat config
npm run lint:fix      # autofix
npm run format        # prettier --write
npm run format:check  # what CI runs
npm run typecheck     # tsc --noEmit
```

ESLint uses the flat config at `eslint.config.js`. Prettier uses `.prettierrc`. Both run on every PR.

## Branching, commits, PRs

- Base branch: `master`. Branch off, target master.
- Branch names: `feat/<short-desc>`, `fix/<short-desc>`, etc.
- Commits: Conventional Commits. PR title becomes the squashed commit message. Enforced by `.github/workflows/pr-title.yml`.
- PRs squash-merge.
- CI: `.github/workflows/ci.yml` (lint + typecheck + test + build on Node 18, 20, 22), `.github/workflows/skill-smoke.yml`, `.github/workflows/release.yml` (release-please + npm publish).

## Releases

Releases are automated by `release-please`. Merging `feat:` / `fix:` commits to `master` causes the bot to open a release PR; merging that PR cuts a tag, the `release.yml` workflow then runs `npm publish` with provenance.

Do not manually edit `package.json` `version`. The bot owns it.

## Known failure modes

### `npm install` is unusually slow

The first install fetches ~250 dev deps (vitest, eslint, tsup, typedoc, etc.). Subsequent installs are cached. There are no native bindings to compile.

### `npm test` hangs or times out

The retry test (`tests/errors.test.ts` "retries on 429 up to maxRetries") deliberately exercises the retry-with-backoff path and can take 3 to 5 seconds. If a single test exceeds 15 seconds, that is a real failure.

### `npm run build` succeeds but `require('browsefleet')` fails

Likely a `package.json` `exports` regression. Re-verify the smoke-test commands above (the ESM and CJS one-liners). If only one breaks, the `exports` map is wrong.

### Cannot find `Response` / `ReadableStream` / `FormData`

The SDK requires Node 18+ for these globals. On older Node, install a polyfill (`undici`) and assign before constructing `BrowseFleet`.

## Don't do

- Do not edit `dist/`. It is generated by `tsup`.
- Do not add a runtime dependency without discussion. The SDK ships with zero.
- Do not edit `src/version.ts`'s replacement target. The `globalThis.__BROWSEFLEET_VERSION__` form is matched by `tsup.config.ts` `define`; renaming either side breaks version injection.
- Do not reintroduce the deleted `BillingAPI`. The server's billing routes were removed in the OSS conversion.

## Where to ask

- Bugs: [open an Issue](https://github.com/theRJMurray/browsefleet-node/issues) with the bug report template.
- Features: feature request template.
- Discussion: [GitHub Discussions](https://github.com/theRJMurray/browsefleet-node/discussions).
- Security: see [`SECURITY.md`](./SECURITY.md). Do not file security issues publicly.

---

_Last updated as part of OSS Phase 4 (2026-05-21). Linked from the README's AI Agent banner._
