---
name: setup-worktree
description: Sets up a Git worktree for a task or feature. Derives a branch name from the task description, creates an isolated worktree directory, copies env files, and installs dependencies. Use when starting work on a new feature or task in isolation.
---

# Setup Worktree

Creates an isolated Git worktree for a task or feature so work happens independently of the main working tree. A helper script does the setup deterministically — you only need to invoke it correctly and read what it returns.

## Prerequisites

- Run with your shell working directory at the target git repository root.
- The helper script lives in this skill bundle at `scripts/setup-worktree.sh`. Do not assume the target repository ships its own copy.

> Script path is relative to the skill's base directory provided when you load the skill.

## Usage

```bash
scripts/setup-worktree.sh <verb> <feature-description> [--spec <path>] [--base <branch>]
```

| Argument | Required | Values |
|----------|----------|--------|
| verb | Yes | feat, fix, chore, hotfix |
| feature-description | Yes | kebab-case (e.g., reference-fix, invoice-rounding-logic) |
| --spec \<path\> | No | relative path to a spec file to move into the worktree |
| --base \<branch\> | No | branch to base the worktree off; overrides the auto-detected default branch. Created from the default branch (and pushed) if it doesn't exist yet |

When `--base` is omitted the script auto-detects the default branch. Pass `--base` when the worktree should branch off a specific branch instead — for example a feature/integration branch when the work is a subset of a larger feature. The branch passed to `--base` does not need to exist yet: if it exists nowhere, the script creates it from the default branch and pushes it, so a not-yet-created branch is still a valid `--base` value.

## Output

The script prints a JSON report — read it to continue. `path` / `cd_command` give the worktree location; `install_status` flags whether the dependency install succeeded; `copied_spec` is the spec path if one was moved into the worktree.
