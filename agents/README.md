# Agents

Each agent is defined in two files — one per tool that loads it:

| File | Used by | Format |
|------|---------|--------|
| `<agent>.md` | Claude | Markdown with YAML frontmatter |
| `<agent>.toml` | Codex | TOML |

## Keeping them in sync

The `developer_instructions` field in each `.toml` file is the equivalent of the markdown body in the `.md` file. When you update an agent's instructions, update both files.

The `.md` frontmatter fields (`name`, `description`) map directly to the TOML `name` and `description` fields — keep these identical.

**`model:`** in the `.md` frontmatter uses Claude model names, while the TOML `model` field uses Codex model names. `model: inherit` in markdown means omit the `model` field in TOML so Codex uses the session default.

**`disallowedTools:`** in the `.md` frontmatter denies specific tools (Claude removes them from the agent's inherited set). Leaf worker agents that should never delegate set `disallowedTools: Agent` so they cannot spawn sub-agents — this is the deterministic guard that backs up the "Do not delegate" instruction in the body.

Codex has no per-agent equivalent: the agent TOML fields (`name`, `description`, `developer_instructions`, and optionally `nickname_candidates`, `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`) cannot deny a tool or the spawn capability. Instead, nested delegation is capped globally by `agents.max_depth` in `config.toml`, which defaults to `1` (a direct child can spawn, but no deeper nesting). So on the Codex side the guard is the global depth cap plus the `developer_instructions` reminder — keep that instruction text identical to the `.md` body.
