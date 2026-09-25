// Flags comments that say more than they need to. Most comments should be one
// line: a comment that restates the code should be deleted (fix the naming if
// that is the real gap); one that explains why should stay, trimmed to the
// shortest version that still carries the reason. Three faults, listed in one
// report per comment: length over two lines (a `//` run, a block, JSDoc prose,
// or a wrapped JSDoc tag); a change-narration opener ("Added", "This function");
// a request marker ("as requested", "per the spec"), first match only. A block
// or JSDoc comment starting on line 1 is a license header and skips the length
// check only.

const MAX_LINES = 2

const NARRATION_OPENER =
  /^\s*(added|updated|changed|fixed|removed|refactored|now|this function|this method|here we)\b/i

const REQUEST_MARKER =
  /\b(?:as requested|per the spec|per your feedback|as discussed|to address (?:your|the) (?:comments?|feedback|review))\b/i

const TRAILER =
  "Most comments: one line. Restates what the code already says → delete it; fix naming only if that's the real gap. Explains why, not what → keep it, but trim to the shortest version that still carries the reason."

function isJsDoc(comment) {
  return comment.type === 'Block' && comment.value.startsWith('*')
}

// Strips the `*` gutter JSDoc lines carry, so `* @param x` reads as `@param x`.
function stripGutter(line) {
  return line.replace(/^\s*\*?\s?/, '')
}

// Lines of a comment body with the fence lines removed: for `/*` and `*/` on
// their own lines the body starts and ends with an empty line, which is not
// content. Interior blank lines are dropped too, so a JSDoc summary separated
// from its description by a blank line still counts only its text.
function contentLines(value) {
  return value
    .split('\n')
    .map((line) => stripGutter(line).trim())
    .filter((line) => line.length > 0)
}

function joinClauses(clauses) {
  if (clauses.length === 1) return clauses[0]
  return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`
}

function lengthFaults(kind, lines) {
  if (kind === 'jsdoc') {
    const faults = []
    const firstTag = lines.findIndex((line) => line.startsWith('@'))
    const prose = firstTag === -1 ? lines : lines.slice(0, firstTag)
    if (prose.length > MAX_LINES) {
      faults.push(`has a ${prose.length}-line JSDoc summary (max ${MAX_LINES}. Excludes tags)`)
    }
    if (firstTag !== -1) {
      let tag = null
      let tagLines = 0
      const flush = () => {
        if (tag && tagLines > 1) faults.push(`has a multi-line @${tag} tag`)
      }
      for (const line of lines.slice(firstTag)) {
        const match = /^@(\w+)/.exec(line)
        if (match) {
          flush()
          tag = match[1]
          tagLines = 1
        } else {
          tagLines += 1
        }
      }
      flush()
    }
    return faults
  }
  if (lines.length > MAX_LINES) {
    return [`runs to ${lines.length} lines (max ${MAX_LINES})`]
  }
  return []
}

function contentFaults(lines) {
  const faults = []
  const opener = NARRATION_OPENER.exec(lines[0] ?? '')
  if (opener) faults.push(`opens with narration ('${opener[1]}')`)
  const marker = REQUEST_MARKER.exec(lines.join('\n'))
  if (marker) faults.push(`contains a request marker ('${marker[0]}')`)
  return faults
}

export const noNoisyComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow comments longer than two lines, comments that open by narrating a change, and comments that cite a request ("as requested", "per the spec"). One report per comment, listing every fault.',
    },
    schema: [],
    messages: {
      noisyComment: `Comment {{faults}}.\n${TRAILER}`,
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    function isTrailing(comment) {
      const before = sourceCode.getTokenBefore(comment, { includeComments: false })
      return Boolean(before) && before.loc.end.line === comment.loc.start.line
    }

    // Groups consecutive `//` comments — adjacent lines, nothing but whitespace
    // between them — into one unit. Block comments and trailing comments are
    // always a unit of their own; a trailing comment never opens a run either.
    function groupComments(comments) {
      const groups = []
      let run = null
      for (const comment of comments) {
        const trailing = isTrailing(comment)
        if (
          comment.type === 'Line' &&
          !trailing &&
          run &&
          comment.loc.start.line === run.comments[run.comments.length - 1].loc.end.line + 1
        ) {
          run.comments.push(comment)
          continue
        }
        const kind = comment.type === 'Line' ? 'run' : isJsDoc(comment) ? 'jsdoc' : 'block'
        const group = { kind, trailing, comments: [comment] }
        groups.push(group)
        run = kind === 'run' && !trailing ? group : null
      }
      return groups
    }

    function linesOf(group) {
      if (group.kind === 'run') return group.comments.map((comment) => comment.value.trim())
      return contentLines(group.comments[0].value)
    }

    return {
      Program() {
        for (const group of groupComments(sourceCode.getAllComments())) {
          const first = group.comments[0]
          const last = group.comments[group.comments.length - 1]
          const lines = linesOf(group)
          const licenseHeader = group.kind !== 'run' && !group.trailing && first.loc.start.line === 1
          // A trailing `//` comment is one line by construction; a trailing
          // block comment can still span lines, so it keeps the length check.
          const skipLength = licenseHeader || (group.trailing && group.kind === 'run')
          const faults = [
            ...(skipLength ? [] : lengthFaults(group.kind, lines)),
            ...contentFaults(lines),
          ]
          if (faults.length === 0) continue
          context.report({
            loc: { start: first.loc.start, end: last.loc.end },
            messageId: 'noisyComment',
            data: { faults: joinClauses(faults) },
          })
        }
      },
    }
  },
}
