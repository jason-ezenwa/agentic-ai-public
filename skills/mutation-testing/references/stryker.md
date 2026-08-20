# Stryker Setup and Configuration

For JS/TS repos. Read this only when the user has chosen to install and configure a mutation tool. A hand-rolled campaign needs none of it.

## Installing under pnpm

**Install into the workspace as devDependencies. Do not run it through `npx`.**

```bash
pnpm add -D -w @stryker-mutator/core @stryker-mutator/jest-runner
```

Under pnpm's strict `node_modules` layout, `npx stryker` fails in a cascade — first a missing `typescript`, then `jest-environment-node`, then the runner plugin itself. Each failure looks like a different problem and none of them mean the approach is wrong. Installing into the workspace resolves all three at once, because the packages then sit where pnpm can link them.

Once installed this way, the runner plugin must be **declared explicitly** in the config. Stryker's auto-discovery does not find it under pnpm.

In a monorepo, install and run from the package you are mutating, not the repo root.

## Configuration requirements

These are the properties a working configuration must have. Map them onto whatever config format the version in use expects.

| Requirement | Why |
|---|---|
| `mutate` is the changed line ranges, derived at run time | A curated file list only grows, is never pruned, and rots silently — rename a file and its entry becomes a no-op that still reads as covered |
| Line ranges, never whole files | The single biggest cost lever, because Stryker pays per mutant. A one-line doc-comment edit to a 1,500-line legacy service must contribute one range, not 1,500 |
| Test and spec files excluded from mutation | They are what is being judged |
| Only the tests covering each mutant are run | Whole-suite-per-mutant is the difference between minutes and hours |
| No threshold that fails the build | This never gates anything |
| Base branch detected, not hardcoded | The default branch is not always `main` |
| Base branch overridable | For comparing against something other than the default branch |

## Wiring the scope in

`mutate` has to be computed at run time, so the config must be executable — a `.mjs` config, not a static `.json`.

Copy `scripts/mutation-scope.sh` from this skill bundle into the repo (`scripts/mutation-scope.sh` is a reasonable home) so the config has something stable to call. It already handles base-branch detection, the `MUTATION_BASE` override, test-file exclusion, resolving from the repository root, and exiting non-zero on an empty scope.

```js
// stryker.config.mjs
import { execFileSync } from 'node:child_process';

const scope = execFileSync('scripts/mutation-scope.sh', ['--joined'], {
  encoding: 'utf8',
}).trim();

if (!scope) {
  throw new Error('Mutation scope is empty. Refusing to report a clean run.');
}

console.log(`Mutating ${scope.split(',').length} line ranges`);

export default {
  packageManager: 'pnpm',
  testRunner: 'jest',
  plugins: ['@stryker-mutator/jest-runner'],
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  coverageAnalysis: 'perTest',
  mutate: scope.split(','),
  concurrency: 4,
  thresholds: { high: 100, low: 0, break: null },
  reporters: ['clear-text', 'progress', 'html'],
};
```

`execFileSync` throws if the script exits non-zero, so an empty scope aborts the run instead of producing a clean report over nothing. The explicit `throw` covers the case where the script succeeds but returns nothing. Keep both.

`break: null` is what keeps the run from ever failing a build. Do not set it to a number, and do not add this to CI.

## Verifying the config before trusting it

Run it once and read the printed scope. As a rough scale, a 40-range, 13-file diff produced 165 mutants in about 6–7 minutes at concurrency 4. If the mutant count or the runtime is far higher than the number of changed lines suggests, `mutate` has resolved to whole files. If it is zero, the run is worthless regardless of what it reports — git pathspecs resolve against the current working directory, and Stryker's cwd is the package directory, not the repo root. The scope script resolves from the repository root specifically to avoid this, but confirm the printed scope matches the diff you expect before believing any result.
