---
name: quality-assurance
description: QA skill for browser-based UI validation and functional test plan execution. Handles authentication and routes to the appropriate reference based on the task.
---

# Quality Assurance

> All paths are relative to the skill's base directory provided when you load the skill.

## Reference guides

- **UI validation** — [UI validation guide](references/ui-validation.md)
- **Test plan execution** — [test plan guide](references/execute-test-plan.md)

**You must read and follow the reference guide that matches your QA type before doing any work. This is mandatory and must not be skipped** — it defines exactly how validation is expected to be performed.

For authentication and transport, read the **[authentication & transport reference](references/authentication-and-transport.md)**. It defines transport selection (headless vs attached), the pre-flight check for attached sessions, and every browser and API auth flow. You must read this before any work. This is mandatory and must not be skipped.

For any browser-driven task, also read the **[playwright-cli manual](references/playwright-cli.md)** — it is the tool manual for every browser interaction.

The caller may pass the feature spec for context. Treat it as background only — the presence of Figma references inside the spec does **not** mean you should run UI validation, and the presence of a test plan does **not** mean you should run scenarios.

---

## Scratch Pad

After reading the reference guides above, invoke `/agent-scratch-pads`. It will guide you through any accumulated notes for the feature or task.
