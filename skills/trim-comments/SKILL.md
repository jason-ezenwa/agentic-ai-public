---
name: trim-comments
description: Cuts down verbose comments.
---

# Trim Comments

Sweep the comments you introduced in this change and cut them down.

Code should be self-documenting and shouldn't rely on large blocks of comments to explain it, but specific nuances or decisions that aren't obvious from reading the code alone are worth a comment.

- Most comments: one line.
- 2-3 lines only when the info is genuinely important (a non-obvious constraint, invariant, or workaround).
- Restates what the code already says → delete it; fix naming instead if that's the real gap.
- Explains *why*, not *what* → keep it, but trim to the shortest version that still carries the reason.
