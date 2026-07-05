---
name: sub-agent-driven-verification
description: Workflow for verification and feedback on work done based on a spec or set of instructions. Used after a spec/ticket/task has been implemented. It orchestrates code review and QA (test plan execution and UI validation) through sub agents, applies the fixes they surface, and reports back.
---

# Sub-Agent-Driven Verification

This skill runs the verification and feedback phase on work that has already been implemented. It uses sub-agents to review and QA the work — keeping the feedback unbiased by the implementation — then applies the fixes they flag, confirms the build and tests pass, and returns the reports to the caller.

## Inputs

- The **spec / ticket / task** the work was based on, passed to you at invocation. It is your acceptance criteria and drives QA routing.
- You are running in the **worktree/branch where the implementation was done**. You review the **local changes directly** — no remote diff fetch needed.

---

### 1. Code Review (The "Guardrails" Check)
Delegate code reviews to **three sub-agents in parallel** — two for feature correctness, one for code quality. The two correctness agents each review the full change set independently — the goal is two separate opinions, not a split. Using sub-agents avoids bias from the implementing agent reviewing its own work.

Pass all three sub-agents the list of files changed and the spec content. They return reports. Using the combined reports, ask yourself:
1.  **Completeness**: Was every endpoint defined in "API Design" implemented?
2.  **Compliance**: Were all "Goals" met? Were all "Non-Goals" avoided?
3.  **Quality**: Are there any linting errors or obvious bugs?
4.  **Consistency**: Does the code match the "Proposed Architecture"?

> **If you find discrepancies:** Fix them now. Do not ask the user for permission to fix bugs. Once fixes are applied, send changes back to the sub-agent that flagged them — independently. Do not send correctness fixes to the code quality reviewer or vice versa. Use the same sub-agent instance, not a new one. If issues persist after this second pass, escalate to the user rather than looping further.

### 2. QA Validation (After Clean Code Review)

Determine which QA agents to spawn based on what the spec contains:

| Spec contains | Agent to spawn | Mode |
|---|---|---|
| **Figma References** section | UI validation sub-agent | UI validation only |
| **QA Test Plan** section | Test plan execution sub-agent | Test plan execution only |
| Both | Both sub-agents | Synchronously — test plan execution first, then UI validation |
| Neither | — | Skip this step entirely, go to Step 3 |

**If neither condition is met**, skip this step and proceed directly to Step 3.

> When both apply, run them **synchronously — test plan execution first, then UI validation — never in parallel.** Both drive a browser and would otherwise compete for it. Wait for the test plan agent to return before spawning the UI validation agent.

#### Spawning the test plan execution sub-agent

Provide:
- The spec file path so it can read the **QA Test Plan** section in full
- The **app URL** (local dev server or staging) — run the app to obtain it
- Any auth context needed (credentials, auth method, environment)
- Explicit instruction: execute the test plan scenarios only — do not perform UI pixel comparison

#### Spawning the UI validation sub-agent

Provide:
- The spec file path so it can read the Figma references (fileKey and nodeId)
- The **local URL** where the implemented page or component is running — run the app to obtain it
- The **feature-slug** used during implementation
- The **Figma frame dimensions** (width × height) from the design context
- Explicit instruction: validate UI fidelity only — do not execute any test plan

#### After QA agents return

Review each agent's report:
- **Failures**: fix the issues in code, then send the changes back to the **same sub-agent instance** that reported them — do not spawn a new one. Send UI validation fixes back to the UI validation sub-agent; send test plan failures back to the test plan execution sub-agent. Do not cross-send between the two.
- Once all sub-agents return a full pass, proceed to Step 3.

> **If fixes require a second round of code review:** only send the changed files back to the relevant code review sub-agent — not a full re-run of all agents.

---

### 3. Confirm Build & Tests

Only once the code review passes and QA validation passes (or was skipped):

**Run the build and tests.** If you made any fixes during review or QA, confirm they're green before reporting. Run sequentially — build first, then tests:
- **Build**: determine the command from `package.json` scripts (`build`, `type-check`, `typecheck`, in that order; fall back to `tsc` only if none exist) and run it.
- **Tests**: run the relevant test suite. In a monorepo, prefer a targeted run scoped to what changed.
- Both must pass. If either fails, fix and re-run before continuing.

### 4. Completion

Report back to the caller:
- The **code review report** (findings + what was fixed).
- The **QA validation report** (if QA ran) — include everything each agent(s) returned: pass/fail per criterion, any fixes applied, and the evidence they relayed (screenshots and API request/response observations from the QA agent(s)).
- Confirmation that the build and tests pass.

#### Presenting screenshot evidence

When QA was browser-driven and produced screenshots, render the images to the user proactively as part of this report — do not wait to be asked, and do not just list paths. Read the returned screenshot files and present them inline, **grouped intelligently** by what they show: cluster related scenarios/flows together, give each group a short heading, and lead with the groups that contain failures — never dump every image in one undifferentiated block.
