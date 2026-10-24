# Figma to Code

---

## Step 1: Get File Key and Node ID

Take the file key and node ID from the Figma URL in the spec (or from the user). With the `figma-desktop` MCP and no URL, tools use the currently selected node and only `nodeId` is needed.

---

## Steps 2 & 3: Fetch Design Context + Preview (Run in Parallel)

For each frame, fetch design context and screenshot concurrently, before implementation begins.

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

Treat the Figma MCP output as a design + behaviour reference, not final code style.

- **Always** check for existing components before creating new ones — reuse over recreation.
- Prefer the project's design system tokens over Figma or Tailwind values where they differ, adjusting spacing/sizing minimally to maintain visual fidelity.
- Add JSDoc comments for exported components.
