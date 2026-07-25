---
name: implement-spec
description: Implements a feature based on a provided technical specification, ensuring the app builds and the implementation adheres to the spec. Use this when you are about to work on a task or feature and you have a spec file, or when the user says "implement the spec" or "implement <spec name>". Provides instructions on the desired/preferred workflow for taking intent from implementation to PR.
---

# Implement Spec Skill

> All paths are relative to the skill's base directory provided when you load the skill.

This skill guides you through implementing a feature defined in a Technical Specification file (usually in `docs/technical-specs/`). It mandates a strict workflow of Worktree Setup -> Analysis & Planning -> Implementation -> Spot Checks -> Verification -> PR Creation.

Keep your focus on getting the work done and the app compiling. Verification (code review + QA) runs once you're done — as Step 4, just before the PR — so you know it's coming, but don't divert to it until the implementation work is complete.

## Workflow

### 0. Worktree Setup
Invoke the `/setup-worktree` skill to create an isolated worktree for this task. Follow its usage instructions.

After the worktree is created, proceed to Analysis & Planning.

### 1a. Analysis & Planning
1.  **Read the Spec**: Use the tool available to you for reading files to read the target technical specification artifact (e.g., `docs/technical-specs/feature-name.md`).
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

**Shared dependencies first**: any file that other streams will import (DTOs, types, base components, constants) must be implemented in the main session before parallel work begins.

Once shared dependencies exist, delegate the independent streams to subagents — up to a maximum of 3. Do not always spin up 3; use as many as the work genuinely calls for. Parallelise only if there are 2+ independent work streams. If unsure or the spec is small, stick with sequential implementation.

For each subagent, provide:
- The path to the spec file so it can read the full context itself
- The specific files/module it is responsible for — scoped so it does not overstep into another stream's files
- The approach to follow: TDD (if it owns backend service/utility code) and Figma-to-Code (if the spec has Figma references). Pass the approach reference file(s) to the subagent so it can see how to go about it
- A directive to implement the assigned stream itself — it must not delegate further or spawn its own subagents
- A brief note on its role in the overall implementation (e.g. "you are implementing the dashboard page and its components")

**Do not commit during subagent work.** Subagents implement and return results. Review their output, apply any corrections, then commit everything together after verification.

### 3. Spot Checks
Ensure successful builds and lint checks. For lint fixes, fix them manually — do not run `npm lint --fix` or similar automation. This ensures only files in the spec are touched.

### 4. Verification (Code Review & QA)
Before raising the PR, run the `/sub-agent-driven-verification` skill, passing it the spec. It returns the Code Review and QA reports — fold them into the PR body in Step 5.

> **Skip this step only if the caller has told you verification is handled separately** (e.g. an orchestrator that verifies after you). In that case, proceed straight to PR Creation.

---

### 5. PR Creation (After Verification Passes)
Only once the build is clean and verification has passed (or was skipped):

1. **Commit** following Conventional Commits format — this single commit covers your implementation and any fixes verification applied. The type must match the branch prefix:
   ```bash
   git add -A
   git commit -m "<type>: <short imperative description>"
   ```
   Examples: `feat: add contractor onboarding flow`, `fix: correct invoice rounding logic`

2. **Push branch**:
   ```bash
   git push -u origin <branch-name>
   ```

3. **Check if a PR already exists** for this branch:
   ```bash
   gh pr view <branch-name> --json url -q .url
   ```
   - **If a PR exists**: skip creation. The new commit is already on the branch and the existing PR is updated. Capture the existing PR URL.
   - **If no PR exists**: create one using the GitHub CLI. Use the base branch detected in Step 0. The body must include the spec summary, a list of files changed, the code review and QA reports from Step 4 (omit a report if that step was skipped), and the test plan (if present in the spec):
   ```bash
   gh pr create \
     --base <base-branch> \
     --title "<type>(<optional scope>): <short description>" \
     --body "$(cat <<'EOF'
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
   EOF
   )"
   ```

   Examples of PR titles: `feat(onboarding): add contractor onboarding flow`, `fix(invoice): correct invoice rounding logic`, `docs: update API usage guide`

4. **Capture the PR URL** from the output.

5. **Fallback**: If `gh` CLI is not available, warn the user, skip PR creation, and provide the branch name so they can open a PR manually.

### 6. Completion
Only when you are **confident** that:
1.  The code is implemented.
2.  The app builds without errors.
3.  The implementation matches the Spec.
4.  Verification has passed (or was skipped because the caller handles it separately).
5.  A PR has been raised (or the user has been notified of the branch if `gh` is unavailable).

Then notify the user with:
- A brief summary of what was implemented.
- The **code review and QA reports** (if verification ran here).
- The **PR URL** for them to review.
- Which **base branch** the PR targets.
