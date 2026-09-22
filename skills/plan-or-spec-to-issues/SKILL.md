---
name: plan-or-spec-to-issues
description: Breaks down a plan or technical spec into dependency-ordered implementation issues with native blocking.
---

# Plan or Spec to Issues

## Input

You will be given a **GitHub issue** — referenced by URL or issue number on the current repo, typically produced by the `/create-technical-spec` skill. Read the spec body thoroughly before doing anything else: `gh issue view <spec> --json title,body -q .body`.

## Decompose into issues

Decompose before creating anything. Break the plan or spec into small vertical slices. Each issue should:

- Deliver one coherent end-to-end behaviour, independently verifiable capability, or observable operational outcome
- Be independently verifiable end-to-end
- Be small enough to implement in one focused session
- Have clearly definable inputs (blockers) and outputs (what it unblocks)

Across the whole spec, use the **fewest slices that satisfy the above** — "small enough for one session" is a ceiling, not a target. A handful of slices that each earn their keep (e.g. 2-8) beats a larger set of thin ones (e.g. 7-12) covering the same spec.

Identify the dependency order across all issues before producing anything, and assign each issue a **level**: issues with no blockers are level 1, issues that only depend on level-1 issues are level 2, and so on. Dependencies should describe the behaviours, capabilities, or outcomes that must be complete before another issue can begin. Do this work in memory — do not write scratch files.

## Proposal & Approval (required before any writes)

After decomposing the spec and **before creating any GitHub issues**, present the proposed decomposition to the user and wait for explicit approval.

The proposal must include, for each planned issue:
- Its dependency position, level, and title
- A one-sentence summary
- How its behaviour, capability, or outcome will be verified end-to-end
- Its blockers (by title)

Also surface:
- The dependency order and levels across the set, grouped so parallelizable issues are obvious
- Any requirements from the source spec you are deliberately excluding, and why
- The source spec issue and the title of the issue-set hub that will be created
- The **feature branch** all issue worktrees will branch off (propose `feat/<feature-slug>` derived from the spec slug; the user can override). This branch is the merge target for every issue PR — it is never merged into the default branch until QA has been done and the user explicitly triggers it.

Wait for the user to say "approved", "go ahead", "looks good", "proceed", or to send revisions. If they request changes, update the decomposition and re-propose. Do not skip this step even if the decomposition seems obvious — created GitHub issues can't be cleanly undone, only closed.

Once approved, carry out the write steps below.

## Step 1 — Create the issue-set hub

Create the hub first; every sub-issue attaches to it. The hub is the single place that links the spec, records the workflow, and (once resolved in Step 3) shows dependency levels.

1.  Render the hub body to `/tmp/issue-set-<feature-slug>-<timestamp>.md` using this structure:

    ```markdown
    ## Technical spec

    #<spec-number>

    ## Feature branch

    `feat/<feature-slug>`

    All sub-issue worktrees branch off this. Every sub-issue PR targets this branch — **never the default branch**. The feature branch is only merged into the default branch once all sub-issues are merged and QA has passed.

    ## Dependency levels

    <One row per level, using the decomposition's titles — issue numbers aren't known yet, resolved in Step 3.>

    | Level | Issues | Notes |
    |-------|--------|-------|
    | 1 | <Title A>, <Title B> | No dependencies. Can be worked in parallel worktrees. |
    | 2 | <Title C> | Start after <Title A> and <Title B> are merged. |

    ## Picking up a sub-issue

    Verify all blockers shown in this issue's dependency graph are merged; do not start against unmerged dependency branches. After verification, implement it end-to-end through to a PR.

    ## QA

    Do not initiate feature-level QA on individual sub-issues. Each sub-issue must be verified against its own Verification section. Feature QA happens only once every sub-issue is merged and the feature is fully assembled, and only when the user explicitly asks for it.
    ```

2.  Create it and capture its number + node ID:

    ```bash
    gh issue create --title "<Feature> — Implementation Issue Set" --body-file /tmp/issue-set-<feature-slug>-<timestamp>.md
    gh api "/repos/<owner>/<repo>/issues/<hub-number>" --jq .id
    ```

## Step 2 — Sub-issue body structure

Keep sub-issue bodies minimal — GitHub renders the parent (hub) link and blocking relationships natively, so duplicating them in the body is noise.

Each sub-issue body must follow this structure:

```markdown
> **Before you start:** Read the parent issue set (#<hub-number>) in full first.

## Spec reference

#<spec-number> — <relevant sections>

## Summary

<Concise description of the end-to-end behaviour, independently verifiable capability, or observable operational outcome this issue makes work.>

## Verification

- <How to verify the behaviour, capability, or outcome end-to-end>
```

Do not include a "Blockers" or "Unblocks" section — GitHub's dependency graph on the hub and on each sub-issue shows this.

## Step 3 — Create sub-issues in dependency order, then resolve the levels table

For each decomposed issue, in dependency order (earliest dependencies first):

1.  Render the body using the structure from Step 2 and write it to `/tmp/subissue-<slug>-<timestamp>.md`. `/tmp` is self-cleaning on reboot.
2.  Create the issue:
    ```bash
    gh issue create --title "<Title>" --body-file /tmp/subissue-<slug>-<timestamp>.md
    ```
    Capture the new issue's number and node ID. Get the ID via:
    ```bash
    gh api "/repos/<owner>/<repo>/issues/<number>" --jq .id
    ```
3.  Attach as a sub-issue of the **hub** using the GitHub Sub-Issues API:
    ```bash
    gh api -X POST "/repos/<owner>/<repo>/issues/<hub-number>/sub_issues" -F sub_issue_id=<child_id>
    ```
4.  For each blocker (a previously created sub-issue this one depends on), add a blocking relationship using the GitHub Issue Dependencies API. Use `gh api` with the current dependencies endpoint (the agent should verify exact syntax against GitHub's docs at the time of execution; the relationship is "this issue is blocked by <blocker>"). If the API call fails, fall back to adding a `Blocked by #N` line in the issue body so the relationship is at least human-readable.

Once every sub-issue is created, resolve the hub's Dependency levels table: rewrite the table's `Issues` column entries as `#<number>` (title still fine alongside it), keeping the same level grouping and notes decided during the proposal. Push the update in a single edit:

```bash
gh issue edit <hub-number> --body-file /tmp/issue-set-<feature-slug>-<timestamp>.md
```

## Step 4 — Verify

After all sub-issues are created:

- Each sub-issue appears under the hub's "Sub-issues" list (check via `gh api "/repos/<owner>/<repo>/issues/<hub-number>/sub_issues"`).
- Each blocking relationship renders on the dependent issue's page.
- The hub's Dependency levels table uses resolved `#N` references and its levels/order match the blocking relationships actually set via the API.
- The hub body links the technical spec and records the feature branch.
- No circular dependencies (if the dependencies API accepted a cycle, revisit the decomposition).
- Every sub-issue has an end-to-end verification path.

## Step 5 — Report

Report back with:
- The issue-set hub URL
- Any requirements from the source spec that were deliberately excluded and why
