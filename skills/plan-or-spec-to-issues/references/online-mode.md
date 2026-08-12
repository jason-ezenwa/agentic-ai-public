# Online Mode

No local files are written. The skill creates a **parent issue-set hub** issue — the online equivalent of the local README — that links the technical spec and records the workflow rules (feature branch, pick-up steps, QA rule). All sub-issues attach to this hub, **not** to the spec issue, and GitHub's native sub-issue and issue-dependency relationships render the hierarchy and blockers on the hub page directly.

The **technical spec stays a technical spec** — its own issue (or local file). The hub is a separate, lightweight coordination issue that points at it, exactly as the local README sits beside the spec rather than replacing it.

> The decomposition and the [Proposal & Approval](../SKILL.md#proposal--approval-required-before-any-writes) gate happen in the main skill before this guide's write steps run.

## Step 1 — Resolve the source spec

- If the input is an issue URL or number, that's the source spec issue.
- If the input is a local file with a `<!-- github-issue: #N https://github.com/<owner>/<repo>/issues/N -->` stamp, that stamp identifies the source spec issue.
- Fetch the spec body: `gh issue view <spec> --json body -q .body` (or read from the local file).

## Step 2 — Create the issue-set hub

> **Gate:** Only proceed once the user has approved the proposal. This is especially important in online mode — created GitHub issues can't be cleanly undone, only closed.

Create the hub first; every sub-issue attaches to it. The hub is the README-equivalent: the single place that links the spec and records the workflow.

1.  Render the hub body to `/tmp/issue-set-<feature-slug>-<timestamp>.md` using this structure:

    ```markdown
    ## Technical spec

    #<spec-number>

    ## Feature branch

    `feat/<feature-slug>`

    All sub-issue worktrees branch off this. Every sub-issue PR targets this branch — **never the default branch**. The feature branch is only merged into the default branch once all sub-issues are merged and QA has passed.

    ## Picking up a sub-issue

    1. Verify all blockers (shown in this issue's dependency graph) are merged — do not start against unmerged dependency branches.
    2. Invoke the `/implement-spec` skill — it creates a worktree, implements the work, and raises a PR against the feature branch above.

    ## QA

    Do not run QA on individual sub-issues. QA happens only once every sub-issue is merged and the feature is fully assembled, and only when the user explicitly asks for it.
    ```

2.  Create it and capture its number + node ID:

    ```bash
    gh issue create --title "<Feature> — Implementation Issue Set" --body-file /tmp/issue-set-<feature-slug>-<timestamp>.md
    gh api "/repos/<owner>/<repo>/issues/<hub-number>" --jq .id
    ```

## Step 3 — Sub-issue body structure

Keep sub-issue bodies minimal — GitHub renders the parent (hub) link and blocking relationships natively, so duplicating them in the body is noise.

Each sub-issue body must follow this structure:

```markdown
> **Before you start:** Read the parent issue set (#<hub-number>) in full first.

## Spec reference

#<spec-number> — <relevant sections>

## Summary

<One sentence naming what this issue builds.>

## Scope

<Concise bullet points per file or component — name the method, field, or route and state what it does in one line. Point to the relevant section of the spec rather than repeating it.>

## Files to create/modify

**New:**
- `<path>`

**Modified:**
- `<path>` — <what changes>

_(omit a category if empty)_
```

Do not include a "Blockers" or "Unblocks" section — GitHub's dependency graph on the hub and on each sub-issue shows this.

## Step 4 — Create sub-issues in dependency order

For each decomposed issue, in dependency order (earliest dependencies first):

1.  Render the body using the structure from Step 3 and write it to `/tmp/subissue-<slug>-<timestamp>.md`. `/tmp` is self-cleaning on reboot.
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

## Step 5 — Verify

After all sub-issues are created:

- Each sub-issue appears under the hub's "Sub-issues" list (check via `gh api "/repos/<owner>/<repo>/issues/<hub-number>/sub_issues"`).
- Each blocking relationship renders on the dependent issue's page.
- The hub body links the technical spec and records the feature branch.
- No circular dependencies (if the dependencies API accepted a cycle, revisit the decomposition).

## Step 6 — Report

Report back with:
- The issue-set hub URL (and the technical spec issue URL)
- A bullet list of created sub-issues (number, title, URL, blockers)
- Any scope items from the source spec that were deliberately excluded and why

Do not instruct the user to look at local files — there are none.
