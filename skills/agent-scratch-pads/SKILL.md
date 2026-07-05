---
name: agent-scratch-pads
description: Ephemeral per-feature notes for agents. Read hints left by prior agents — or yourself in a previous run — before starting work. Contribute anything that may be useful to you or other agents at any point during your work. Useful for QA agents or any agent actively driving the app via browser or API — if you are only reading code or planning, do not write to the pad.
---

# Agent Scratch Pads

Scratch pads are freeform notes scoped to a project and feature, stored in `/tmp`. They persist across agent restarts within a session but clear on machine restart or when a cloud session ends — working memory, not permanent storage.

**Notes are soft hints, not hard rules.** Try what applies, skip what doesn't. If something is wrong or outdated, correct it in place — do not append a correction below the original.

---

## File structure

```
/tmp/agent-scratch-pads/
  <project-slug>/
    features-and-tasks/
      <feature-slug>.md
    domains/
      <domain-name>.md
```

Derive the project slug: `basename $(git rev-parse --show-toplevel)`

Derive the feature slug: use the spec filename without extension (e.g. `docs/technical-specs/forgot-password.md` → `forgot-password`). If there is no spec file, derive a kebab-case name from the task description.

Domain names are kebab-case.

---

## Reading — do this now

1. Derive the project slug and feature slug
2. Check `/tmp/agent-scratch-pads/<project-slug>/features-and-tasks/<feature-slug>.md` — read it if it exists
3. Read the `domains:` frontmatter from that pad, then read each listed domain pad from `/tmp/agent-scratch-pads/<project-slug>/domains/`. If the pad exists but has no `domains:` key, skip this step.
4. If no feature pad exists, list the files in `domains/` and read the `description:` frontmatter of each. Read the full content of any whose description is relevant to the task.

If none of the above paths exist, there is nothing to read — proceed with your work.

Apply what's relevant. Ignore the rest.

---

## Writing — contribute as you go

**Only write if you are actively driving the app** — browser interactions or API calls. If you are only reading code or planning, do not write to the pad.

Write the moment you discover something worth noting — don't wait until the end. A quick note mid-task is better than a complete writeup that never happens because it slipped your mind. You may also want to refer back to it yourself later in the same task.

Do a final pass when your work is complete to capture anything you didn't get to.

1. Create directories if needed: `mkdir -p /tmp/agent-scratch-pads/<project-slug>/features-and-tasks /tmp/agent-scratch-pads/<project-slug>/domains`
2. If the feature pad exists, read it first then edit in place. If not, create it.
3. Add your notes. Be specific — one or two lines per item is enough.
4. If a note is broadly applicable beyond this feature, also write it to the relevant domain pad under `domains/`.

---

## Pad format

**Feature / task pad:**

```markdown
---
domains: [auth]
---

# <feature-slug>

> Soft hints — try these first, skip what doesn't apply.

[your notes here]
```

**Domain pad:**

```markdown
---
description: Login, session handling, OTP, password flows
---

# <domain-name>

[your notes here]
```

### Nice-to-have sections

Use these when they fit. Skip them when they don't. Add your own if nothing fits.

- **Setup** — how to reach the starting state, environment, preconditions
- **Auth** — test credentials and login steps only. Do not write secrets, tokens, or production credentials.
- **Gotchas** — timing issues, surprising behaviour, workarounds
- **UI Notes** — locators, interaction patterns, element finding tricks
- **Test Data** — values, IDs, states that worked
- **Out of Scope** — issues noticed that fall outside this task's scope
