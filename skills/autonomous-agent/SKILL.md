---
name: autonomous-agent
description: Autonomously plans, specs, implements, verifies, and raises a PR for a task — without requiring the human to be present for the planning phase. Use this skill when the user hands off a task and asks you to handle it end-to-end, or when phrases like "auto-implement", "handle this autonomously", "fire and forget", or "work on this without me" appear. Also use when the user provides a task description and signals they want to review the output rather than participate in the planning.
---

# Autonomous Agent Skill

This skill runs the full engineering workflow autonomously — from raw task description to a verified PR — without requiring the human in the planning loop.

It mirrors the standard human-in-the-loop workflow, except the grill-me session targets a **tech lead subagent** instead of the human. Throughout, the main agent acts as an **orchestrator**: it plans, specs, delegates the implementation, drives verification, and raises the PR. It does **not** implement the feature itself — the only code changes it makes directly are the review/QA fixes applied while driving verification (Phase 4). It raises the PR itself because a sub-agent may not be able to open one.

---

## Workflow Overview

```
Phase 1: Self-Grilling (with tech lead subagent)
    ↓
Phase 2: Create spec → validate with tech lead → reconcile
    ↓
Phase 3: Delegate implementation to a sub-agent (runs /implement-spec, no PR)
    ↓
Phase 4: Verification (sub-agent code review + QA, returns reports)
    ↓
Phase 5: Finalise — orchestrator raises the PR (verified work + reports + decisions)
```

---

## Phase 1 — Self-Grilling with Tech Lead Subagent

### Goal
Reach the same shared understanding you would have after a grill-me session with the human — but autonomously, by discussing with the tech lead subagent.

### Running the session

Spawn the tech lead subagent. Invoke the `/grill-me` skill, directing every question at the tech lead subagent instead of the human.

**Keep a reference to this tech lead agent** — you will need to send it the spec in Phase 2. Do not treat it as a one-shot agent.

### Termination condition

Continue until you have no remaining open questions and feel you have reached a clear, shared understanding with the tech lead subagent. At that point, communicate that you are satisfied and ready to proceed to spec.

If there are unresolved blockers that genuinely require human input, **stop here** and surface them clearly before proceeding.

---

## Phase 2 — Spec Creation and Validation

### Step 1 — Create the spec

Invoke the `/create-technical-spec` skill. The spec should reflect the decisions and understanding reached in Phase 1. Do not re-open questions that were already resolved.

Save to: `docs/technical-specs/<feature-name>.md`

### Step 2 — Tech lead validation

Send the spec to the **same tech lead agent from Phase 1** — not a new instance. Because it was present for the grill-me session, it holds the shared understanding that the spec must reflect.

Ask it to review the spec for alignment with what was agreed, following its spec review behaviour. Specifically, it should flag:
- Anything that drifts from decisions reached in Phase 1
- Places where the spec suggests the main agent misunderstood something that was discussed
- Gaps that were not addressed during the grill-me session and are still unresolved in the spec

### Step 3 — Reconcile

If the tech lead flags issues:
- Address each one. Decisions already agreed in Phase 1 are not up for debate — if the spec drifted from them, correct the spec. If a gap is new, resolve it now.
- Update the spec and re-send it to the tech lead for a second pass.
- Repeat until the tech lead has no remaining flags.

Only once the tech lead confirms the spec is aligned, proceed to Phase 3.

---

## Phase 3 — Implementation (Delegated)

You are an orchestrator — you do **not** implement. Delegate the entire implementation to a sub-agent.

Spawn an implementation sub-agent and give it:
- The **spec** (its path, or the content) as the acceptance criteria.
- Its prompt: **invoke the `/implement-spec` skill to implement the work, but skip its Verification step (Step 4) and do not raise the PR.** Verification (Phase 4) and raising the PR (Phase 5) are yours — a sub-agent may not be able to open PRs. It should set up the worktree, implement, get the build clean, and commit and push its work to the branch. Do **not** set up a worktree yourself.

Ask the sub-agent to return:
- The **worktree path** it created
- The **branch name** (committed and pushed, no PR yet)
- A brief summary of what it implemented

You need the worktree path and branch for Phases 4 and 5.

---

## Phase 4 — Verification

Change into the worktree path the implementation sub-agent returned in Phase 3, then invoke the `/sub-agent-driven-verification` skill, passing it the spec. It runs the sub-agent code review and QA, fixes whatever they flag, and confirms the build and tests pass, then returns the Code Review and QA reports. It does **not** touch the PR — that's Phase 5.

Only proceed to Phase 5 once verification reports a clean pass. Keep the returned reports for the PR.

---

## Phase 5 — Finalise: Raise the PR

The implementation sub-agent could not open the PR, so finalising the work means **you raise it** — now, with verified work on the branch.

1. **Push the verification fixes** from Phase 4 — `git add -A && git commit -m "<type>: <fixes>" && git push`. If verification applied no fixes, the branch is already current.
2. **Raise the PR** following `/implement-spec`'s PR Creation step for the base body — Summary, Changes Made, Code Review Report and QA Validation (from Phase 4), and Test Plan — then append the two autonomous-specific sections below.

```
## Decisions
<A high-level picture of the key decisions made during Phase 1 (grill-me session with the tech lead) and Phase 2 (spec reconciliation), with brief reasoning for each — both decisions that shaped the spec and corrections made after the tech lead's validation review. Keep this high-level.>

## Assumptions
<Only include this section if there were assumptions that could not be verified from the codebase, or questions that were deferred. List each with a brief note on why it could not be confirmed. Omit this section entirely if there are none.>
```

### Task references
If this task originated from a Jira ticket or ClickUp task, reference it explicitly in the PR body (e.g. `Closes SCOOLER-123` or the ClickUp task URL). If neither was used, omit this.

---

## Output Summary

| Artifact | Location |
|---|---|
| Technical spec | `docs/technical-specs/<feature-name>.md` — serves as the task's audit trail |
| Implementation | Feature branch + worktree, created by the implementation sub-agent via `/implement-spec` |
| Pull request | Implemented in Phase 3, verified in Phase 4, raised by the orchestrator in Phase 5 with verified work — body carries a summary, changes, code review and QA reports, a testing guide, and a high-level decisions summary + assumptions |

---

## Notes

- If at any point during Phase 1 you encounter a genuine blocker that cannot be resolved without human input, **stop and surface it**. Do not guess past a hard blocker.
- The decisions section in the PR is not a formality — it should contain real reasoning, not platitudes.

---

## Gotchas

For each skill referenced within this skill (and its subskills), **you must invoke it using the Skill tool, wait for it to load, then follow its distinct instructions**.
