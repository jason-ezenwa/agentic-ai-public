// Flags comments that point at an ADR instead of stating the intent directly.
// "ADR 14" only means something next to the spec it came from, and every spec
// numbers its ADRs from 1 — so the same label points somewhere different
// depending on which document you happen to be holding. Say what the decision
// was and why, in the comment.

// Ordered by specificity: a numbered reference must win over the bare word so
// "ADR 14" reports once, not twice.
const ADR_PATTERN =
  /\bADRs?[-–—#:.\s]*\d+|\bADRs?\b|\barchitecture\s+decision\s+records?\b/gi

// `//` and `/*` are both two characters, so a comment's text always starts two
// characters after the token itself.
const COMMENT_TEXT_OFFSET = 2

function findReferences(text) {
  const matches = []
  ADR_PATTERN.lastIndex = 0
  let match = ADR_PATTERN.exec(text)
  while (match) {
    const reference = match[0].trim()
    matches.push({
      text: reference,
      index: match.index,
      messageId: /\d/.test(reference) ? 'numberedAdrReference' : 'unnumberedAdrReference',
    })
    match = ADR_PATTERN.exec(text)
  }
  return matches
}

export const noAdrReferences = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow references to ADRs (e.g. "ADR 14", "ADR-3") in comments. ADR numbers are only meaningful next to the spec that defines them — state the decision and its rationale in the comment instead.',
    },
    schema: [],
    messages: {
      numberedAdrReference:
        'Replace "{{reference}}" with the constraint or reason itself, without naming the ADR.',
      unnumberedAdrReference:
        '"{{reference}}" sends the reader out of this file. State the constraint or reason itself.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          for (const reference of findReferences(comment.value)) {
            const start = comment.range[0] + COMMENT_TEXT_OFFSET + reference.index
            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(start),
                end: sourceCode.getLocFromIndex(start + reference.text.length),
              },
              messageId: reference.messageId,
              data: { reference: reference.text },
            })
          }
        }
      },
    }
  },
}
