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

const numbered = (reference: string) => ({
  messageId: 'numberedAdrReference',
  data: { reference },
})
const unnumbered = (reference: string) => ({
  messageId: 'unnumberedAdrReference',
  data: { reference },
})

ruleTester.run('no-adr-references', noAdrReferences, {
  valid: [
    // a comment that explains the decision instead of pointing at it
    `// Retries are capped at 3 so a failing portal cannot stall the queue.\nconst retries = 3`,
    // "adr" as part of a longer word must not trip the rule
    `// The quadratic solver handles the padre case.\nconst x = 1`,
    // "adr" at the start of a longer word must not trip the rule either
    `// The adrenaline spike is expected here.\nconst x = 1`,
    // a string literal mentioning an ADR is not a comment
    `const label = 'ADR 14'`,
    // a template literal mentioning an ADR is not a comment
    `const label = \`See ADR-3\``,
    // code with no comments at all
    `const x = 1`,
  ],
  invalid: [
    // space-separated number
    {
      code: `// See ADR 14 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR 14')],
    },
    // hyphenated
    {
      code: `// See ADR-3 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR-3')],
    },
    // no separator at all
    {
      code: `// See ADR14 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR14')],
    },
    // hash separator
    {
      code: `// See ADR #7 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR #7')],
    },
    // colon separator
    {
      code: `// See ADR: 2 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR: 2')],
    },
    // lowercase
    {
      code: `// See adr 5 for the rationale.\nconst x = 1`,
      errors: [numbered('adr 5')],
    },
    // mixed case, hyphenated
    {
      code: `// See Adr-9 for the rationale.\nconst x = 1`,
      errors: [numbered('Adr-9')],
    },
    // zero-padded number
    {
      code: `// See ADR 003 for the rationale.\nconst x = 1`,
      errors: [numbered('ADR 003')],
    },
    // plural with a number
    {
      code: `// See ADRs 4 and onwards.\nconst x = 1`,
      errors: [numbered('ADRs 4')],
    },
    // lowercase hyphenated inside a doc path
    {
      code: `// Rationale in docs/decisions/adr-012.md\nconst x = 1`,
      errors: [numbered('adr-012')],
    },
    // bare reference with no number is just as opaque
    {
      code: `// The ADR says to prefer the service layer.\nconst x = 1`,
      errors: [unnumbered('ADR')],
    },
    // bare lowercase reference
    {
      code: `// The adr says to prefer the service layer.\nconst x = 1`,
      errors: [unnumbered('adr')],
    },
    // spelled out, singular
    {
      code: `// See the architecture decision record on caching.\nconst x = 1`,
      errors: [unnumbered('architecture decision record')],
    },
    // spelled out, plural
    {
      code: `// See the architecture decision records on caching.\nconst x = 1`,
      errors: [unnumbered('architecture decision records')],
    },
    // block comment
    {
      code: `/* Per ADR 14 we refresh eagerly. */\nconst x = 1`,
      errors: [numbered('ADR 14')],
    },
    // JSDoc comment
    {
      code: `/**\n * Refreshes eagerly, per ADR-3.\n */\nfunction refresh() {}`,
      errors: [numbered('ADR-3')],
    },
    // trailing comment
    {
      code: `const x = 1 // ADR 14`,
      errors: [numbered('ADR 14')],
    },
    // two references in one comment report twice
    {
      code: `// ADR 14 supersedes ADR-3.\nconst x = 1`,
      errors: [numbered('ADR 14'), numbered('ADR-3')],
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
