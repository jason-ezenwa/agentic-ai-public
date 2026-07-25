# Figma to Code

**Follow these steps in order. Do not skip steps.**

---

## Step 1: Get Node ID

### Option A: Parse from Figma URL

When the user provides a Figma URL, extract the file key and node ID.

**URL format:** `https://figma.com/design/:fileKey/:fileName?node-id=1-2`

- **File key:** the segment after `/design/`
- **Node ID:** the value of the `node-id` query parameter (e.g., `42-15`)

**Example:**
- URL: `https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15`
- File key: `kL9xQn2VwM8pYrTb4ZcHjF`
- Node ID: `42-15`

### Option B: Figma Desktop App Selection (`figma-desktop` MCP only)

When using the `figma-desktop` MCP and the user has NOT provided a URL, tools automatically use the currently selected node from the open Figma file. Only `nodeId` is needed — the server infers the file automatically.

---

## Steps 2 & 3: Fetch Design Context + Preview (Run in Parallel)

Fetch design context and screenshot concurrently — all fetching happens simultaneously before implementation begins.

### Reference storage and reuse

Cache each Figma reference to a deterministic path — the **same** convention the QA UI-validation step uses — so it is fetched once and reused, never refetched. Two artifacts share one stem:

```
/tmp/<feature-slug>/figma-references/figma-ref__<fileKey>__<nodeId-sanitized>__<scale>x.png    # screenshot
/tmp/<feature-slug>/figma-references/figma-ref__<fileKey>__<nodeId-sanitized>__context.txt    # get_design_context output
```

- `<feature-slug>` — kebab-case feature/branch name for this task. Use it consistently.
- Sanitize `<nodeId>` by replacing `:` with `-` (colons are unsafe in filenames).
- `context.txt` holds the raw `get_design_context` output — reference code (with design values embedded) and asset URLs. If the context was truncated and rebuilt from child nodes, note that in the file so QA treats it as partial.

**Check the cache before fetching — fetch only the misses:**

```bash
STEM="/tmp/${SLUG}/figma-references/figma-ref__${FILE_KEY}__${NODE_ID//:/-}"
PNG="${STEM}__${SCALE}x.png"
CTX="${STEM}__context.txt"

[ -f "$PNG" ] || echo "miss — call get_screenshot, save to $PNG"
[ -f "$CTX" ] || echo "miss — call get_design_context, save to $CTX"
```

`/tmp` clears on restart and cloud sessions start fresh — no manual invalidation needed.

### For a single frame

```
get_design_context(fileKey=":fileKey", nodeId="1-2")   # save output to context.txt (skip if cached)
get_screenshot(fileKey=":fileKey", nodeId="1-2")       # save PNG (skip if cached)
```

### For multiple frames

For each frame, run:
1. `get_design_context` for that frame — returns the full context (layout, typography, colors, spacing, tokens); save it to `context.txt` (see Reference storage and reuse), skipping the call if cached
2. `get_screenshot` for that frame — save the PNG, skipping the call if cached
3. Note the complete design context and any Code Connect findings

### Handling large design contexts

**If `get_design_context` is truncated or too large** (for any frame):
1. Run `get_metadata(fileKey=":fileKey", nodeId="1-2")` to get the high-level node map.
2. Identify the specific child nodes needed.
3. Fetch each child individually: `get_design_context(fileKey=":fileKey", nodeId=":childNodeId")`.

### Code Connect handling
- If `get_design_context` returns a script asking to map components, **STOP** and follow the script exactly.
- Do not proceed with implementation until Code Connect mappings are resolved or explicitly skipped by the user.

---

## Step 4: Download Required Assets

For any images, icons, or SVGs returned by the Figma MCP server, download them into `src/assets/` (create the directory only if it doesn't already exist) and reference them by their local path in the code.

**Rules:**
- If the Figma MCP server returns a `localhost` source for an image or SVG, fetch it from that URL and save it locally — do not modify the URL when fetching, and do not embed the localhost URL in the final code.
- **Do NOT** add new icon packages. All assets must come from the Figma payload.
- **Do NOT** use placeholders if a `localhost` source is available.

---

## Step 5: Implement the Code

Translate the Figma output into the project's framework, styles, and conventions.

**Key principles:**
- Treat the Figma MCP output as a design + behaviour reference, not final code style.
- **Always** check for existing components before creating new ones — reuse over recreation.
- Replace Tailwind utility classes with the project's design system tokens and conventions where they differ.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data-fetching patterns.
- When project design tokens differ from Figma values, prefer project tokens but adjust spacing/sizing minimally to maintain visual fidelity.
- Follow WCAG accessibility requirements.
- Add TypeScript types for all component props.
- Add JSDoc comments for exported components.
- Avoid hardcoded values — extract to constants or design tokens.

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Design context is truncated | Design is too complex for a single response | Use `get_metadata` to get node structure, then fetch specific child nodes individually |
| Visual mismatch after implementation | Spacing, colour, or typography discrepancy | Fix the flagged CSS properties, then send to the same QA sub-agent for re-validation |
| Assets not loading | `localhost` URLs being modified | Use the MCP-provided `localhost` URLs directly without modification |
| Design tokens differ from Figma | Project tokens have different values | Prefer project tokens for consistency; adjust spacing/sizing minimally to match visuals |
| Code Connect script appears | Component mapping required | Stop and follow the script exactly; do not proceed until resolved or skipped |
