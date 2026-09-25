import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noNoisyComments } from './no-noisy-comments.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

const TRAILER =
  "Most comments: one line. Restates what the code already says → delete it; fix naming only if that's the real gap. Explains why, not what → keep it, but trim to the shortest version that still carries the reason."

const noisy = (faults: string) => ({ messageId: 'noisyComment', data: { faults } })
const fullMessage = (faults: string) => ({ message: `Comment ${faults}.\n${TRAILER}` })

const NARRATION_OPENERS = [
  'Added',
  'Updated',
  'Changed',
  'Fixed',
  'Removed',
  'Refactored',
  'Now',
  'This function',
  'This method',
  'Here we',
]

const REQUEST_MARKERS = [
  'as requested',
  'per the spec',
  'per your feedback',
  'as discussed',
  'to address your feedback',
  'to address the review',
  'to address the comments',
]

ruleTester.run('no-noisy-comments', noNoisyComments, {
  valid: [
    // a one-line comment
    `// Retries are capped so a failing portal cannot stall the queue.\nconst retries = 3`,
    // a two-line run
    `// Retries are capped so a failing portal cannot stall the queue.\n// The cap is per job, not per portal.\nconst retries = 3`,
    // a four-line run split by a blank line is two valid two-line comments
    `// The cap is per job.\n// Not per portal.\n\n// And never zero.\n// Nor negative.\nconst x = 1`,
    // a two-line block comment
    `/*\n * Retries are capped so a failing portal cannot stall the queue.\n * The cap is per job, not per portal.\n */\nconst retries = 3`,
    // JSDoc with two prose lines and several single-line tags
    `/**\n * Retries the job.\n * The cap is per job, not per portal.\n * @param job the job to retry\n * @param cap the maximum attempts\n * @returns the final attempt\n */\nfunction retry(job, cap) {}`,
    // JSDoc with no tags and two lines
    `/**\n * Retries the job.\n * The cap is per job, not per portal.\n */\nfunction retry() {}`,
    // a license header on line 1 longer than two lines
    `/*\n * Copyright 2026 Example\n * Licensed under the MIT license.\n * See LICENSE for the full text.\n */\nconst x = 1`,
    // a JSDoc license header on line 1 longer than two lines
    `/**\n * Copyright 2026 Example\n * Licensed under the MIT license.\n * See LICENSE for the full text.\n */\nconst x = 1`,
    // a word that merely starts with an opener
    `// Nowadays the portal returns 429 on a burst.\nconst x = 1`,
    `// Fixedpoint math avoids the rounding drift.\nconst x = 1`,
    // marker text inside a string literal rather than a comment
    `const note = 'Changed the cap as requested'`,
    // a trailing comment with nothing wrong
    `const x = 1 // a sentinel the portal never returns`,
    // a marker phrase inside a longer word is not a marker
    `// Auto addressing is disabled for this portal.\nconst x = 1`,
    // "to address" on its own is ordinary rationale, not a request marker
    `// Normalize the path to address the trailing-slash mismatch.\nconst x = 1`,
    // a trailing block comment of two lines
    `const x = 1 /* a sentinel\n the portal never returns */`,
  ],
  invalid: [
    // 3-line `//` run
    {
      code: `// The cap is per job.\n// Not per portal.\n// And never zero.\nconst x = 1`,
      errors: [noisy('runs to 3 lines (max 2)')],
    },
    // a blank line splits a run: the 2-line half is valid, the 3-line half is reported
    {
      code: `// The cap is per job.\n// Not per portal.\n\n// And never zero.\n// Nor negative.\n// Nor fractional.\nconst x = 1`,
      errors: [{ messageId: 'noisyComment', data: { faults: 'runs to 3 lines (max 2)' }, line: 4 }],
    },
    // a trailing `//` comment does not open a run: the 3-line run under it is checked on its own
    {
      code: `const x = 1 // sentinel\n// The cap is per job.\n// Not per portal.\n// And never zero.\nconst y = 2`,
      errors: [{ messageId: 'noisyComment', data: { faults: 'runs to 3 lines (max 2)' }, line: 2 }],
    },
    // a trailing `//` comment does not swallow the narration on the next line
    {
      code: `const x = 1 // sentinel\n// Added the cap.\nconst y = 2`,
      errors: [{ messageId: 'noisyComment', data: { faults: "opens with narration ('Added')" }, line: 2 }],
    },
    // a trailing block comment still gets the length check
    {
      code: `const x = 1 /* a sentinel\n the portal\n never returns */`,
      errors: [noisy('runs to 3 lines (max 2)')],
    },
    // 3-line block comment
    {
      code: `const y = 2\n/*\n * The cap is per job.\n * Not per portal.\n * And never zero.\n */\nconst x = 1`,
      errors: [noisy('runs to 3 lines (max 2)')],
    },
    // a block comment longer than two lines that is not on line 1 is not a license header
    {
      code: `\n/*\n * Copyright 2026 Example\n * Licensed under the MIT license.\n * See LICENSE for the full text.\n */\nconst x = 1`,
      errors: [noisy('runs to 3 lines (max 2)')],
    },
    // JSDoc with three prose lines
    {
      code: `const y = 2\n/**\n * Retries the job.\n * The cap is per job.\n * Not per portal.\n */\nfunction retry() {}`,
      errors: [noisy('has a 3-line JSDoc summary (max 2. Excludes tags)')],
    },
    // JSDoc with a wrapped @param
    {
      code: `const y = 2\n/**\n * Retries the job.\n * @param job the job to retry, which must already\n *   have been claimed by this worker\n * @returns the final attempt\n */\nfunction retry(job) {}`,
      errors: [noisy('has a multi-line @param tag')],
    },
    // JSDoc with a wrapped @returns after a fine @param
    {
      code: `const y = 2\n/**\n * Retries the job.\n * @param job the job to retry\n * @returns the final attempt, or null when\n *   the cap was already hit\n */\nfunction retry(job) {}`,
      errors: [noisy('has a multi-line @returns tag')],
    },
    // each narration opener
    ...NARRATION_OPENERS.map((opener) => ({
      code: `// ${opener} the retry cap.\nconst x = 1`,
      errors: [noisy(`opens with narration ('${opener}')`)],
    })),
    // narration openers are case-insensitive
    {
      code: `// FIXED the retry cap.\nconst x = 1`,
      errors: [noisy(`opens with narration ('FIXED')`)],
    },
    // narration in a block comment
    {
      code: `const y = 2\n/* Added the retry cap. */\nconst x = 1`,
      errors: [noisy(`opens with narration ('Added')`)],
    },
    // narration in the first JSDoc prose line
    {
      code: `const y = 2\n/**\n * This function retries the job.\n * @param job the job\n */\nfunction retry(job) {}`,
      errors: [noisy(`opens with narration ('This function')`)],
    },
    // each request marker
    ...REQUEST_MARKERS.map((marker) => ({
      code: `// Cap retries ${marker}.\nconst x = 1`,
      errors: [noisy(`contains a request marker ('${marker}')`)],
    })),
    // request markers are case-insensitive
    {
      code: `// Cap retries As Requested.\nconst x = 1`,
      errors: [noisy(`contains a request marker ('As Requested')`)],
    },
    // a marker on the second line of a run is still found
    {
      code: `// Cap retries.\n// Done per the spec.\nconst x = 1`,
      errors: [noisy(`contains a request marker ('per the spec')`)],
    },
    // two markers: only the first is reported
    {
      code: `// Cap retries as requested and as discussed.\nconst x = 1`,
      errors: [noisy(`contains a request marker ('as requested')`)],
    },
    // trailing comment with narration
    {
      code: `const x = 1 // Added the sentinel`,
      errors: [noisy(`opens with narration ('Added')`)],
    },
    // trailing comment with a marker
    {
      code: `const x = 1 // sentinel, as discussed`,
      errors: [noisy(`contains a request marker ('as discussed')`)],
    },
    // combination: length + narration
    {
      code: `// Added the cap.\n// It is per job.\n// Not per portal.\nconst x = 1`,
      errors: [fullMessage(`runs to 3 lines (max 2) and opens with narration ('Added')`)],
    },
    // combination: length + marker
    {
      code: `// The cap is per job.\n// Not per portal.\n// Done as requested.\nconst x = 1`,
      errors: [fullMessage(`runs to 3 lines (max 2) and contains a request marker ('as requested')`)],
    },
    // combination: narration + marker on one line
    {
      code: `// Fixed the cap as requested.\nconst x = 1`,
      errors: [fullMessage(`opens with narration ('Fixed') and contains a request marker ('as requested')`)],
    },
    // combination: all three
    {
      code: `// Fixed the cap.\n// It is per job.\n// Done as requested.\nconst x = 1`,
      errors: [
        fullMessage(
          `runs to 3 lines (max 2), opens with narration ('Fixed') and contains a request marker ('as requested')`,
        ),
      ],
    },
    // JSDoc combination: summary + wrapped tag + narration
    {
      code: `const y = 2\n/**\n * This method retries the job.\n * The cap is per job.\n * Not per portal.\n * @param job the job to retry, which must already\n *   have been claimed\n */\nfunction retry(job) {}`,
      errors: [
        fullMessage(
          `has a 3-line JSDoc summary (max 2. Excludes tags), has a multi-line @param tag and opens with narration ('This method')`,
        ),
      ],
    },
    // reported location for a `//` run spans from the first comment to the last
    {
      code: `const y = 2\n// The cap is per job.\n// Not per portal.\n// And never zero.\nconst x = 1`,
      errors: [{ messageId: 'noisyComment', line: 2, column: 1, endLine: 4, endColumn: 19 }],
    },
    // two separate noisy comments in one file report separately
    {
      code: `// Added the cap.\nconst x = 1\n// Removed the floor.\nconst y = 2`,
      errors: [noisy(`opens with narration ('Added')`), noisy(`opens with narration ('Removed')`)],
    },
  ],
})
