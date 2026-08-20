# Lint rules

Custom ESLint rules, written once and kept here so they can be dropped into a
new project without anyone re-deriving what the rule should mean.

Copy the rule file verbatim. The semantics — which spellings to catch, what the
message says, what counts as valid — are already settled. Do not rewrite the
regexes or reword the messages to fit a new codebase.

## Rules

| Rule | What it flags |
| --- | --- |
| [`no-adr-references`](no-adr-references.js) | Comments that cite an ADR (`ADR 14`, `ADR-3`, `adr-012`, a bare `ADR`, "architecture decision record") instead of stating the constraint. |
| [`no-optional-nullable-mismatch`](no-optional-nullable-mismatch.js) | Members that are both optional and nullable (`foo?: T \| null`). |
| [`no-hardcoded-tailwind-colors`](no-hardcoded-tailwind-colors.js) | Tailwind color utilities that bypass the design tokens (`bg-white`, `text-black`, `bg-[#fff]`). Web only — it means nothing in a project with no JSX. |

Each rule file opens with a comment explaining why the rule exists and what it
covers. Read it before installing the rule.

## Installing into a project

### 1. Place the rules

In a monorepo, a workspace package the apps can share:

```
packages/eslint-rules/
  package.json
  src/
    index.js
    plugin.js
    no-adr-references.js
    no-optional-nullable-mismatch.js
    no-hardcoded-tailwind-colors.js
```

In a single-app project, `eslint-rules/` at the root is enough — skip the
package.json and import the rules by relative path from the flat config.

### 2. package.json (monorepo only)

Plain ESM with no build step, so `pnpm install` links it and the apps lint
immediately — in CI or a fresh clone.

```json
{
  "name": "@<org>/eslint-rules",
  "version": "0.0.1",
  "private": true,
  "description": "Custom ESLint rules shared across the monorepo apps.",
  "type": "module",
  "main": "./src/index.js",
  "exports": { ".": "./src/index.js" },
  "files": ["src"],
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "@typescript-eslint/parser": "^8.20.0",
    "eslint": "^9.18.0",
    "vitest": "^3.2.4"
  }
}
```

### 3. plugin.js — the glue

Apps consume the plugin and a rule set wholesale, so a rule added here takes
effect without touching any app config.

```js
import { noAdrReferences } from './no-adr-references.js'
import { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'
import { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'

// Apps register this under the `local` namespace, so every rule here is
// addressable as `local/<rule-name>` without the app config naming it.
export const PLUGIN_NAMESPACE = 'local'

export const eslintPlugin = {
  rules: {
    'no-adr-references': noAdrReferences,
    'no-hardcoded-tailwind-colors': noHardcodedTailwindColors,
    'no-optional-nullable-mismatch': noOptionalNullableMismatch,
  },
}

function namespaced(severityByRule) {
  return Object.fromEntries(
    Object.entries(severityByRule).map(([name, severity]) => [
      `${PLUGIN_NAMESPACE}/${name}`,
      severity,
    ]),
  )
}

// Rules that apply to any TypeScript in the project.
export const sharedRuleSet = namespaced({
  'no-adr-references': 'error',
  'no-optional-nullable-mismatch': 'warn',
})

// Everything shared, plus the rules that only mean something in a JSX app.
export const webRuleSet = {
  ...sharedRuleSet,
  ...namespaced({ 'no-hardcoded-tailwind-colors': 'warn' }),
}
```

`index.js` re-exports the rules and the glue:

```js
export { noAdrReferences } from './no-adr-references.js'
export { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'
export { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'

export { PLUGIN_NAMESPACE, eslintPlugin, sharedRuleSet, webRuleSet } from './plugin.js'
```

### 4. Severity

A rule is `error` once the codebase is clean of it, so the count stays at zero.
It stays `warn` while violations remain, so linting is still usable.

Check the real count before choosing, and say which one you picked and why:

```bash
npx eslint . --rule '{"local/no-adr-references":"error"}' --format compact
```

### 5. Wire it into the flat config

A Vite/React app:

```js
import { PLUGIN_NAMESPACE, eslintPlugin, webRuleSet } from '@<org>/eslint-rules'

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    extends: [/* ... */],
    plugins: {
      [PLUGIN_NAMESPACE]: eslintPlugin,
    },
    rules: {
      ...webRuleSet,
    },
  },
])
```

A NestJS/Node app — same shape, `sharedRuleSet` instead of `webRuleSet`:

```js
export default tseslint.config(
  /* ... */
  {
    plugins: {
      [PLUGIN_NAMESPACE]: eslintPlugin,
    },
    rules: {
      ...sharedRuleSet,
    },
  },
)
```

## Write the tests

The tests are not copied — write them in the target project, one
`<rule-name>.test.ts` beside each rule.

Cover valid code and **every spelling and casing variant the rule is meant to
catch**, one `invalid` case per variant with an inline comment naming what that
case is for. Also cover the near-misses that must stay valid: the word inside a
longer word, the same text in a string literal instead of a comment, the same
utility class in a non-className position.

Harness (ESLint's own `RuleTester`, driven by vitest):

```ts
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noAdrReferences } from './no-adr-references.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

ruleTester.run('no-adr-references', noAdrReferences, {
  valid: [
    // a comment that explains the decision instead of pointing at it
    `// Retries are capped at 3 so a failing portal cannot stall the queue.\nconst retries = 3`,
    // "adr" as part of a longer word must not trip the rule
    `// The quadratic solver handles the padre case.\nconst x = 1`,
    // a string literal mentioning an ADR is not a comment
    `const label = 'ADR 14'`,
  ],
  invalid: [
    // hyphenated
    {
      code: `// See ADR-3 for the rationale.\nconst x = 1`,
      errors: [{ messageId: 'numberedAdrReference', data: { reference: 'ADR-3' } }],
    },
    // bare reference with no number is just as opaque
    {
      code: `// The ADR says to prefer the service layer.\nconst x = 1`,
      errors: [{ messageId: 'unnumberedAdrReference', data: { reference: 'ADR' } }],
    },
    // reported location points at the reference, not the whole comment
    {
      code: `// Per ADR 14, refresh eagerly.\nconst x = 1`,
      errors: [
        { messageId: 'numberedAdrReference', line: 1, column: 8, endLine: 1, endColumn: 14 },
      ],
    },
  ],
})
```

A JSX rule needs `parserOptions: { ecmaFeatures: { jsx: true } }` in
`languageOptions` and `.tsx` filenames in the cases.

Variants each rule must be tested against:

- `no-adr-references` — `ADR 14`, `ADR-3`, `ADR14`, `ADR #7`, `ADR: 2`, `adr 5`,
  `Adr-9`, `ADR 003`, `ADRs 4`, `adr-012` in a doc path, bare `ADR`, bare `adr`,
  `architecture decision record(s)`, line and block and JSDoc comments, trailing
  comments, two references in one comment, and the reported location.
- `no-optional-nullable-mismatch` — interface members, type-literal members,
  class fields; `T | null` and `T | null | undefined`; and the valid pair
  (`foo?: T` alone, `foo: T | null` alone).
- `no-hardcoded-tailwind-colors` — `bg-white`, `text-black`, hex in every
  supported prefix; string, template literal, conditional, logical, array and
  object forms; each class helper; and a nested `cn(...)` reporting once.

## Adding a rule

1. Add `<rule-name>.js` here, exporting the rule object. No imports — a rule
   file stands alone, which is what makes it copyable. Open it with a comment
   saying why the rule exists; without that the next project re-litigates it.
2. Add a row to the table above.
3. Add the rule to the `plugin.js` and `index.js` snippets, and to the variants
   list above.
