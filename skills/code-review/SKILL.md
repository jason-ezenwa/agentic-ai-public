---
name: code-review
description: Reviews code changes for correctness, quality, security, and rule compliance. Works on local files or a GitHub PR. Produces a structured report with severity levels and a pass/fail verdict.
---

# Code Review Skill

> All paths are relative to the skill's base directory provided when you load the skill.

## Approach

Be ambitious and rigorous. The goal is not to rubber-stamp the implementation — it is to produce a review that a senior engineer would consider genuinely useful. Push beyond the obvious: look for subtle bugs, design flaws, missed edge cases, and rule violations that a surface-level read would miss. An extensive review that surfaces real issues is always preferable to a quick pass that finds nothing.

---

## Execution Sequence

1. **Determine mode** — Files or PR (see [Review Mode](#review-mode) below)
2. **Run through your assigned checklist** — read the matching reference guide linked at the end of this skill and work through it
3. **Fetch content** — read files directly (Files mode) or fetch the diff (PR mode)
4. **Produce the report** — using the format in [Report Format](#report-format)

---

## Review Mode

### Files mode (default)
Review the specific files or directories mentioned by the user, or the files contextually relevant to the current task (e.g. files just implemented or modified). Read the files directly. No git branch comparison is needed — you may be on any branch or none.

### PR mode
If the user explicitly provides a PR number or URL, fetch the diff using whichever is available:

- **GitHub MCP tools (preferred):** use the `pull_request_read` tool with `method: "get_diff"`, providing the owner, repo, and PR number.
- **gh CLI (fallback):** `gh pr diff <number-or-url>`

Then review the diff output instead of reading files directly.

---

## How to Provide Feedback

- Be specific about what needs to change
- Explain why, not just what
- Suggest alternatives when possible
- Tag every finding with a severity:
  - **Blocker** — must be fixed before the review passes (rule violation, bug, broken type safety)
  - **Warning** — should be fixed but won't block
  - **Suggestion** — optional improvement

---

## Report Format

Always produce a report in this exact structure:

```
## Code Review Report

### Blockers
- <file>:<line> — <description>

### Warnings
- <file>:<line> — <description>

### Suggestions
- <file>:<line> — <description>

### Verdict
PASS / FAIL  (FAIL if any Blockers exist)
```

If a section has no findings, write `None` under it. Do not omit sections.

---

## Reference guides

- **Feature correctness** — [Feature Correctness Checklist](references/feature-correctness.md)
- **Code quality** — [Code Quality Checklist](references/code-quality.md)
