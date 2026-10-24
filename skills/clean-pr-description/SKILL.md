---
name: clean-pr-description
description: Clean up a PR description before or after opening the PR. Use when writing the final PR body, or when the user says "clean up the PR description" / "tighten the PR body".
---

# Clean PR Description

When writing the final PR body, cut it down and leave only important info — not interstitial stuff or notes that read like something was and no longer is, in the course of the work.

Describe the diff against the base branch, not the journey. If something was but no longer is, it should not appear — the PR body describes the net change against the base the PR is against.

Keep the structure flat with no nested bullets. Where a bullet would need sub-points, lean towards making it a heading with its own flat list instead.
