---
name: implement-spec
description: Implements a feature based on a provided technical specification, ensuring the app builds and the implementation adheres to the spec. Use this when you are about to work on a task or feature and you have a spec file, or when the user says "implement the spec" or names a spec to implement. Provides instructions on the desired/preferred workflow for taking intent from implementation to PR.
---

# Implement Spec Skill

> All paths are relative to the skill's base directory provided when you load the skill.

Take the approved technical spec through implementation, verification, and a PR.

Read the spec first, build what it says, stay inside its goals and non-goals, then verify the assembled work before raising the PR.

Do not split your attention between building and final QA: finish the implementation, run the required checks, then verify it properly.

## Workflow

### 0. Worktree Setup
Invoke the `/setup-worktree` skill to create an isolated worktree for this task. Follow its usage instructions.

### 1a. Analysis & Planning
1.  **Read the Spec**: Read the target technical specification artifact (e.g., `docs/technical-specs/feature-name.md`).
2.  **Understand Guardrails**: Pay close attention to the "Goals", "Non-Goals", and "API Design" sections. These are your acceptance criteria.
3.  **Determine implementation approach**:
    - **TDD** — if backend service files or utility functions are implemented. Follow [TDD guide](references/tdd.md).
    - **Figma-to-Code** — if the spec has a Figma References section. Follow [Figma-to-Code guide](references/figma-to-code.md).

    *These are not mutually exclusive — a full-stack change follows both, each for its part of the work.*

### 1b. Task List Creation
After reading the spec, use whatever task/todo tool you have available to create todos that combine this skill's workflow steps with the concrete feature work items from the spec (endpoints, services, models, DTOs, components, pages — drawn from API Design, Goals, and architecture). Create every todo before writing any code.

Build the list from this shape:

- [ ] Worktree setup — `/setup-worktree`
- [ ] Analysis & planning — read spec; confirm Goals / Non-Goals / API Design
- [ ] Implement shared dependencies first (DTOs, types, base components, constants)
- [ ] Delegate parallel tasks to sub-agents
- [ ] Spot checks — build + lint clean
- [ ] Verification — invoke `/sub-agent-driven-verification` (do not hand-roll or approximate)
- [ ] PR creation

### 2. Implementation

#### Parallelisation

Both frontend and backend work can be parallelised, as long as the streams are genuinely independent.

Before writing any code, read the spec and identify independent work streams — frontend components/pages/hooks or backend services/modules that don't depend on each other at compile time. Each stream must live in its **own module/area whose files don't overlap another stream's** — this matters especially for the TDD workflow, so each subagent can run its own red→green loop without colliding with another's tests or sources.

Settle the shared dependencies before sub-agents begin work when independent streams need them (this gives each stream a stable contract and avoids overlapping changes). Then delegate only work that can proceed independently, in separate areas of the codebase. Use up to three sub-agents when the work genuinely benefits from it; keep a small or tightly coupled change sequential.

For each subagent, provide:
- The path to the spec file so it can read the full context itself
- The specific files/module it is responsible for — scoped so it does not overstep into another stream's files
- The approach to follow: TDD (if it owns backend service/utility code) and Figma-to-Code (if the spec has Figma references). Pass the approach reference file(s) to the subagent so it can see how to go about it
- A directive to implement the assigned stream itself — it must not delegate further or spawn its own subagents
- A brief note on its role in the overall implementation (e.g. "you are implementing the dashboard page and its components")

**Do not commit during subagent work.** Subagents implement and return results. Review their output, apply any corrections, then commit everything together after verification.

### 3. Spot Checks
Ensure successful builds and lint checks. For lint fixes, fix them manually — do not run `npm lint --fix` or similar automation. This ensures only files in the spec are touched.

### 4. Verification
Once implementation and spot checks are complete, run the `/sub-agent-driven-verification`
skill against the spec. Use its Code Review and QA reports in the PR.

> **Skip this step only if the caller has told you verification is handled separately** (e.g. an orchestrator that verifies after you). In that case, proceed straight to PR Creation.

---

### 5. PR Creation (After Verification Passes)
Only once the build is clean and verification has passed (or was skipped), commit and raise the PR against the base branch from Step 0.

One commit covers the implementation and any fixes verification applied, in Conventional Commits format — the type must match the branch prefix.

The PR body, omitting any section whose step was skipped:

```markdown
## Summary
<Goals from the spec>

## Changes Made
<Bullet list of files/modules touched>

## Code Review Report
<From verification in Step 4 — findings and what was fixed>

## QA Validation
<From verification in Step 4, if QA ran — pass/fail per criterion, any fixes applied>

## Test Plan
<From the spec's verification section, if present>
```

### 6. Completion
Tell the user what was delivered, what verification found and fixed, and link the PR.
