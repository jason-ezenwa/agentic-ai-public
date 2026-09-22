# Lint rules

Custom ESLint rules, written once and kept here so they can be dropped into a
new project without anyone re-deriving what the rule should mean.

Copy the rule file verbatim. The semantics — which spellings to catch, what the
message says, what counts as valid — are already settled. Do not rewrite the
regexes or reword the messages to fit a new codebase.

## Rules

Every rule is **blocking** or **advisory**. A blocking rule flags code that
is wrong and climbs to `error` once the codebase is clean. An advisory rule
asks for a judgement call, so it stays at `warn` and is never promoted.

| Rule | Kind | What it flags |
| --- | --- | --- |
| [`no-adr-references`](no-adr-references.js) | Blocking | Comments that cite an ADR (`ADR 14`, `ADR-3`, `adr-012`, a bare `ADR`, "architecture decision record") instead of stating the constraint. |
| [`no-optional-nullable-mismatch`](no-optional-nullable-mismatch.js) | Blocking | Members that are both optional and nullable (`foo?: T \| null`). |
| [`no-hardcoded-tailwind-colors`](no-hardcoded-tailwind-colors.js) | Blocking | Tailwind color utilities that bypass the design tokens (`bg-white`, `text-black`, `bg-[#fff]`). Web only — it means nothing in a project with no JSX. |
| [`no-inline-styles`](no-inline-styles.js) | Blocking | The JSX `style` attribute, in every form. Web only. |
| [`no-noisy-comments`](no-noisy-comments.js) | Advisory | Comments longer than two lines (a `//` run, a block, JSDoc prose, or a wrapped JSDoc tag), comments that open by narrating a change (`Added`, `Fixed`, `This function`), and comments that cite a request (`as requested`, `per the spec`). One report per comment, listing every fault it has. |
| [`no-await-waterfall`](no-await-waterfall.js) | Blocking | Two or more consecutive `await` statements in one block where a later one does not use an earlier result. Reported once per run, with the count. A run is made of awaits whose result is bound; a bare `await` (a gate), a multi-declarator declaration and an assignment into a member each end one. React and Next.js data-loading code only, decided by function name and export shape: components and hooks by name, exported `getServerSideProps` / `getStaticProps` / `generateMetadata` / `generateStaticParams` / `loader`, an exported `GET` in a route file (`app/**/route.*`, `pages/api/**`, whose default export counts too), and the default export of an `app/**/page.*`, `layout.*`, `template.*` or `default.*`. A component name needs a lowercase letter, so an all-caps one (`FAQ`, `CTA`) is not recognised — the trade that keeps the handler verbs out. `GET` is the only handler verb checked — `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` and `OPTIONS` are left alone. Also skipped: `'use server'` functions and files, and every other function, since only the nearest enclosing function decides whether the code is data loading (a named inner component is checked, an anonymous callback is not), while `'use server'` is inherited by everything nested in it. Beyond route, page and layout filenames the rule has no notion of file location; it is in the web rule set so it does not run on a backend package. Web only. |
| [`no-regexp-in-render`](no-regexp-in-render.js) | Blocking | A regex literal or `new RegExp(...)` (including `window.RegExp`) inside a function component or hook body, including nested callbacks. `useMemo` callbacks are exempt; class components are out of scope. Web only. |
| [`no-static-io-in-route-handler`](no-static-io-in-route-handler.js) | Blocking | An `fs` read or a `fetch` of a fixed URL inside a Next.js route handler (`app/**/route.*`, `pages/api/**`). Web only. |

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
    no-await-waterfall.js
    no-optional-nullable-mismatch.js
    no-hardcoded-tailwind-colors.js
    no-inline-styles.js
    no-noisy-comments.js
    no-regexp-in-render.js
    no-static-io-in-route-handler.js
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
import { noAwaitWaterfall } from './no-await-waterfall.js'
import { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'
import { noInlineStyles } from './no-inline-styles.js'
import { noNoisyComments } from './no-noisy-comments.js'
import { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'
import { noRegexpInRender } from './no-regexp-in-render.js'
import { noStaticIoInRouteHandler } from './no-static-io-in-route-handler.js'

// Apps register this under the `local` namespace, so every rule here is
// addressable as `local/<rule-name>` without the app config naming it.
export const PLUGIN_NAMESPACE = 'local'

export const eslintPlugin = {
  rules: {
    'no-adr-references': noAdrReferences,
    'no-await-waterfall': noAwaitWaterfall,
    'no-hardcoded-tailwind-colors': noHardcodedTailwindColors,
    'no-inline-styles': noInlineStyles,
    'no-noisy-comments': noNoisyComments,
    'no-optional-nullable-mismatch': noOptionalNullableMismatch,
    'no-regexp-in-render': noRegexpInRender,
    'no-static-io-in-route-handler': noStaticIoInRouteHandler,
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
  'no-noisy-comments': 'warn', // advisory: never promoted to error
  'no-optional-nullable-mismatch': 'warn',
})

// Everything shared, plus the rules that only mean something in a JSX app.
export const webRuleSet = {
  ...sharedRuleSet,
  ...namespaced({
    'no-await-waterfall': 'warn', // blocking: promote to error once clean
    'no-hardcoded-tailwind-colors': 'warn',
    'no-inline-styles': 'warn',
    'no-regexp-in-render': 'warn', // blocking: promote to error once clean
    'no-static-io-in-route-handler': 'warn', // blocking: promote to error once clean
  }),
}
```

`index.js` re-exports the rules and the glue:

```js
export { noAdrReferences } from './no-adr-references.js'
export { noAwaitWaterfall } from './no-await-waterfall.js'
export { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'
export { noInlineStyles } from './no-inline-styles.js'
export { noNoisyComments } from './no-noisy-comments.js'
export { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'
export { noRegexpInRender } from './no-regexp-in-render.js'
export { noStaticIoInRouteHandler } from './no-static-io-in-route-handler.js'

export { PLUGIN_NAMESPACE, eslintPlugin, sharedRuleSet, webRuleSet } from './plugin.js'
```

### 4. Severity

Severity follows the rule's kind in the table above.

An advisory rule is always `warn`. Do not count its violations and do not
promote it, however clean the codebase is.

A blocking rule is `error` once the codebase is clean of it, so the count
stays at zero. It stays `warn` while violations remain, so linting is still
usable. Check the real count before choosing, and say which one you picked
and why:

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

## Restricted imports

**Blocking.** Not a rule file — `no-restricted-imports` already does this, so
the work is config, not code. A **barrel file** is a package entry point that
re-exports its whole surface (`export * from './icons/check'`, thousands of
times over). Importing one name through it makes the bundler load every module
the barrel touches: 200-800ms per package on a cold start, and seconds of extra
dev boot and HMR time. Tree-shaking does not save you — an external package is
not analysed at all, and bundling it to get tree-shaking is what makes builds
slow.

The fix is to import the file you actually use. Ban the barrel and name the
acceptable form in the message, so the error tells the reader what to write:

```js
'no-restricted-imports': [
  'error',
  {
    paths: [
      {
        name: 'lodash',
        message: "Import the function's own file: lodash/debounce. (lodash-es tree-shakes and needs no entry here.)",
      },
      {
        name: 'lucide-react',
        message: 'Import the icon directly: lucide-react/icons/<icon-name>.',
      },
      {
        name: 'react-icons',
        message: 'Import from the icon set entry: react-icons/fa, react-icons/md, and so on. There is no per-icon path in react-icons, so the set entry is the finest allowed.',
      },
      {
        name: 'date-fns',
        message: 'Import the function directly: date-fns/format. (v2 and below only — v3+ tree-shakes, so drop this entry.)',
      },
      {
        name: '@mui/material',
        message: 'Import the component directly: @mui/material/Button.',
      },
    ],
  },
],
```

The `lucide-react` per-icon path is version-dependent: recent versions publish
per-icon entries, while older ones expect the barrel plus tree-shaking, and the
package has carried no `exports` map at all in some releases (checked against
1.47.0), so a deep `dist/esm/icons/...` path resolves but is internal and can
move between versions. Verify the path the installed version actually publishes,
and prefer `optimizePackageImports` where it is available.

The list is per-project: keep the entry only for a package the project actually
depends on, at the version that needs it. A Next.js project that lists these
packages in `experimental.optimizePackageImports` drops the matching entries —
Next rewrites the barrel import to a direct one at build time, and keeps the
types and autocompletion that the deep path loses.

## Tests

The tests live here, beside the rules — one `<rule-name>.test.ts` per rule —
and run with `npm test` (vitest, from the repo root). They are the record of
what each rule means, so a target project does not need its own copy.

Each test file covers valid code and **every spelling and casing variant the
rule is meant to catch**, one `invalid` case per variant with an inline comment
naming what that case is for. It also covers the near-misses that must stay
valid: the word inside a longer word, the same text in a string literal instead
of a comment, the same utility class in a non-className position.

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
- `no-inline-styles` — `style` as an object literal, a variable, a member
  expression and a call; on a DOM element and on a component; a `style` key in
  a spread object literal (`{...{ style: s }}`, shorthand `{...{ style }}`, computed
  `{...{ ['style']: s }}`), including one nested in an inner spread; two elements in one tree reporting twice. Valid: a variable
  named `style` passed to `className`, a prop whose name merely contains
  "style", the `<style>` element, a spread object literal without `style`, a
  non-literal computed key (`{...{ [key]: s }}`), and a spread of an identifier
  (`{...props}`).
- `no-noisy-comments` — a 3-line `//` run; a run split by a blank line (the
  2-line half valid, the 3-line half reported); a 3-line block comment; JSDoc
  with 3 prose lines; JSDoc with a wrapped `@param`; each narration opener
  (`Added`, `Updated`, `Changed`, `Fixed`, `Removed`, `Refactored`, `Now`,
  `This function`, `This method`, `Here we`); each request marker
  (`as requested`, `per the spec`, `per your feedback`, `as discussed`,
  `to address your feedback`); a trailing comment with narration; a trailing
  block comment (length-checked, unlike a trailing `//`); the four combinations
  (length + narration, length + marker, narration + marker on one line, all
  three) asserting the full message string; and the reported location of a
  `//` run. Valid: a 2-line run, a 1-line comment, JSDoc with 2 prose lines and
  several single-line tags, JSDoc with no tags and 2 lines, a license header on
  line 1 longer than 2 lines, `Nowadays`/`Fixedpoint`, and marker text inside a
  string literal. Interior blank lines in a block or JSDoc comment do not count
  as content lines. This rule reports multiple faults in one message — the
  combination cases assert on the whole string, not a `messageId` alone.
- `no-await-waterfall` — the rule checks React and Next.js data-loading code
  only, decided by function name and export shape. One invalid case per checked
  context: a component, a hook, exported `getServerSideProps`, `getStaticProps`,
  `generateMetadata`, `generateStaticParams` and `loader` (as an arrow), an
  exported `GET` in an `app/**/route.*` file, the default export of a
  `pages/api/**` file, the anonymous default export of an `app/**/page.tsx` and of an
  `app/**/template.tsx`, the default export of an `app/**/layout.tsx`, and a
  named component-like arrow inside a component. Then, inside a component: two
  independent `const` awaits; three, asserting the count; `let` declarations;
  plain assignment to an existing binding; a mixed run where only the last await
  is independent; a destructured binding the later await ignores; a member
  property name and a type argument that merely match a binding; two runs in one
  function; a run in a nested block, in a `try` block and in a loop body; and the
  reported location (the first statement of the run). Valid, one per skipped
  context: a `'use server'` function, a file whose first statement is
  `'use server'`, each of those with `'use strict'` ahead of the directive, an
  exported `POST` handler in a route file and in a plain file, an exported `GET`
  in a plain file (an all-caps name is not a component), a plain exported
  utility, a class method, a PascalCase-named class method, top-level await, and
  an anonymous `onSubmit` callback inside a component, and component- and hook-named functions nested in a `'use server'` function. Also valid, inside a
  component: a single await, a dependent chain (including one through
  `config.url`), an object- and an array-destructured chain, awaits split by a
  non-await statement, awaits in different blocks, `await Promise.all([...])`, a
  reassignment chain, a multi-declarator declaration, a bare `await` gate ahead
  of an await, a chain through a member-target assignment, and a chain through a
  member target inside a destructuring pattern.
- `no-regexp-in-render` — a regex literal in a PascalCase function declaration,
  arrow function, anonymous and named function expression, and assignment form;
  `new RegExp(...)`, bare `RegExp(...)`, `new window.RegExp(...)` and
  `globalThis.RegExp(...)`; a regex in a `useX` hook; regexes in
  a nested event handler, a `.map` callback and an inline JSX handler; a regex
  beside a `useMemo` in the same component; a regex in a `useMemo` dependency
  array rather than its callback; two regexes reporting twice; and the reported
  location. Valid: module scope (literal and `new RegExp`), inside a `useMemo`
  callback (literal, constructor, `React.useMemo`, and a callback nested inside
  one), a non-component function, a lowercase arrow, a `username`-style name
  that is not a hook, `RegExp` in a type position, and — the documented limit —
  a class component whose `render` method builds a regex.
- `no-static-io-in-route-handler` — `fetch` of a string literal and of an
  expressionless template literal; `fs.readFile`, `fs.readFileSync`,
  `fs.promises.readFile` (including `node:fs`); named `readFile` /
  `readFileSync` imports from `fs` and `fs/promises`; `const fs = require('fs')`
  and `const { readFile } = require('node:fs/promises')`; a handler wrapped one
  level in a call (`export const GET = withAuth(fn)`); each handler verb across
  the cases; an exported arrow handler; a `pages/api` default export, flat and
  nested; a nested route segment and a `.tsx` route file; a read inside a
  callback in the handler; two reads reporting twice; and the reported location.
  Valid: a non-route filename with the same code (the rule is a no-op), the read
  hoisted to module scope, a module-scope fetch promise awaited in the handler,
  a computed URL and a computed path, a non-handler function in a route file, an
  exported function that is not a handler verb, a `readFile` imported from
  somewhere other than `fs`, a local binding named `fs` that never came from the
  module, and the default export of an `app/**/route.*` file (only `pages/api`
  routes its default export).

## Adding a rule

1. Add `<rule-name>.js` here, exporting the rule object. No imports — a rule
   file stands alone, which is what makes it copyable. Open it with a comment
   saying why the rule exists; without that the next project re-litigates it.
2. Add `<rule-name>.test.ts` beside it, covering every variant the rule catches
   and the near-misses that must stay valid, and make sure `npm test` passes.
3. Decide whether the rule is blocking or advisory. Blocking when a violation
   is wrong code with one right fix; advisory when the message asks the reader
   to judge. If it is not obvious, ask before choosing.
4. Add a row to the table above, with the kind.
5. Add the rule to the `plugin.js` and `index.js` snippets, and to the variants
   list above.
