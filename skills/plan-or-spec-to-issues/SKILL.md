---
name: plan-or-spec-to-issues
description: Breaks down a plan or technical spec into dependency-ordered implementation issues — as local markdown files under docs/issues/, or as GitHub sub-issues under a parent issue-set hub with native blocking.
---

# Plan or Spec to Issues

> All paths are relative to the skill's base directory provided when you load the skill.

## Input

You will be given one of:

- A **local plan or spec file** — a markdown file on disk, typically produced by the `/create-technical-spec` skill
- A **GitHub issue** — referenced by URL or issue number on the current repo, typically produced by the `/create-technical-spec` skill in issue mode

Read the source document thoroughly before doing anything else (fetch via `gh issue view <num> --json title,body -q .body` if it's an issue). If a local spec carries a `<!-- github-issue: #N ... -->` promote stamp, the issue is the source of truth — read its body, not the (possibly stale) local file.

## Output Modes

The skill has two modes:

- **Local mode** (default for local file inputs) — generates dependency-ordered markdown files under `docs/issues/<feature-slug>/`. Best for specs that live locally and aren't tracked on GitHub.
- **Online mode** (default for GitHub issue inputs) — creates a parent issue-set hub issue (linking the technical spec and recording the workflow) plus GitHub sub-issues attached to that hub, with native blocking dependencies. No local files are written. Best when the spec is already an issue so cloud sessions and collaborators can work from it.

### Mode detection

- Input is a **GitHub issue URL or number** → online mode
- Input is a **local file path** → local mode — *unless* it carries a `<!-- github-issue: #N ... -->` promote stamp → **online mode** (the spec is already an issue)
- **Explicit override tokens**: `--online` / `--sub-issues` force online mode; `--local` forces local mode. For online mode on a local file, the file must contain a `<!-- github-issue: #N ... -->` stamp identifying the source spec issue, or the user must supply the spec issue reference.
- **Phrases** also work: "as sub-issues", "create GitHub sub-issues", "keep local", etc.

### Reference guides

- **Local mode** — [local mode guide](references/local-mode.md)
- **Online mode** — [online mode guide](references/online-mode.md)

**Once the mode is determined, read and follow only the reference guide for that mode. This is mandatory and must not be skipped** — it defines exactly how the issues are expected to be produced. Do not read the other mode's guide.

## Decompose into issues

Regardless of mode, decompose before writing or creating anything. Break the plan or spec into discrete, independently implementable units of work. Each issue should:

- Represent a single coherent piece of the system (a service, a schema group, a controller, a handler, etc.)
- Be small enough to implement in one focused session
- Have clearly definable inputs (blockers) and outputs (what it unblocks)

Identify the dependency order across all issues before producing anything. Schema and data layer issues come before service issues; service issues come before controller and handler issues. Do this work in memory — do not write scratch files.

## Proposal & Approval (required before any writes)

After decomposing the spec and **before writing any files or creating any GitHub issues**, present the proposed decomposition to the user and wait for explicit approval.

The proposal must include, for each planned issue:
- Its number (or dependency position) and title
- A one-sentence summary
- Its blockers (by number/title)
- The key files or components it will touch

Also surface:
- The dependency order across the set (a short list or mini graph is fine)
- Any scope items from the source spec you are deliberately excluding, and why
- The mode that will be used (Local or Online) and, for Online, the source spec issue and the title of the issue-set hub that will be created
- The **feature branch** all issue worktrees will branch off (propose `feat/<feature-slug>` derived from the spec slug; the user can override). This branch is the merge target for every issue PR — it is never merged into the default branch until QA has been done and the user explicitly triggers it.

Wait for the user to say "approved", "go ahead", "looks good", "proceed", or to send revisions. If they request changes, update the decomposition and re-propose. Do not skip this step even if the decomposition seems obvious — creating issues or files prematurely is costly to undo (especially on GitHub).

Once approved, carry out the write steps in the reference guide for the selected mode.
