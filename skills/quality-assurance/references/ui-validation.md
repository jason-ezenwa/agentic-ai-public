# UI Validation

You will receive a local URL, Figma node IDs, frame dimensions, and a description of what to validate.

**Acceptable deviations are only the ones called out in the spec** — not ones
named by whoever briefed you. Read the spec's own list. Anything else that
departs from the frames is a finding.

**Scope: visual fidelity only.** This mode validates that the implementation matches the Figma design. Clicking through the UI to reach a state, step, or page you need to screenshot is fine — that is navigation. What is out of scope is asserting that behaviour works.

## Judgment model

Validation uses two co-equal evidence layers — they catch different bugs and neither replaces the other. The pixel diff is an instrument that serves both, not a third layer (see below).

**Deterministic layer** (computed ground truth, measured through `playwright-cli eval` / `run-code`) owns geometry/layout, color, and text metrics:
- **Layout and positioning** — compared via computed bounding boxes (`getBoundingClientRect`) and computed styles. Report pixel deltas.
- **Color** — pulled via `getComputedStyle` on the live elements, not eyeballed off a screenshot (edge anti-aliasing makes screenshot hex unreliable). Report the actual hex codes so the main agent can act on them directly.
- **Text metrics** — `font-size`, `font-weight`, `line-height`,
  `letter-spacing`, `color`, via `getComputedStyle` on every text element in
  the criteria. 13px/500 and 14px/400 look identical in a screenshot and are
  one query apart.

**Vision layer** owns rendering quality and overall visual consistency — how
things render, not what they are set to. Some rendering leeway is intentional: font hinting and sub-pixel anti-aliasing differ across environments (a Linux cloud sandbox will never byte-match a Figma export) — so visual fidelity is judged within tolerance, not by identical bytes.

**Pixel diff — instrument, not a layer.** pixelmatch aligns the implementation screenshot and Figma reference and emits a diff mask. It issues no verdict of its own: it points the vision layer at regions worth inspecting — catching divergences the deterministic layer would never think to query (a stray badge, a missing icon, a shifted block) — and cross-checks the deterministic layer. Its `pct` is an inspection trigger, never a pass/fail gate; a clean deterministic + vision result stands even when `pct` is a noisy low-single-digit number.

Screenshots are required evidence output — they feed the vision layer and the output report.

## Process

### 1. Set Up the Browser

Set the viewport to the Figma frame's exact dimensions and capture at
`deviceScaleFactor: 1`, so the two images already match and nothing needs
resizing. Resizing resamples every glyph, making all text read as changed and
burying real differences in that noise.

If implementation and frame genuinely differ in size — a sanctioned deviation
means the frame carries a row the build does not — do not crop to an eyeballed
"common region". Crop both to the same element's box and diff that. Crops of
differing dimensions are not a valid comparison.

### 2. Navigate and Orient

Navigate to the provided URL and take an initial screenshot to understand the current state of the UI before validating.

### 3. Wait for Content

If the UI has dynamic content (loading states, animations, async data), wait for it to settle before capturing.

### 4. Capture the Implementation Screenshot

Take a screenshot of the current state. For pages with multiple sections, navigate to each section individually (e.g. via URL hash) and capture separately. This makes comparison more manageable. Save any screenshots taken during execution to `/tmp/quality-assurance/<feature-slug>/ui-validation/`. Create the directory if it does not exist. Use descriptive filenames that identify the scenario and step (e.g., `checkout-step2-payment-form.png`).

Always re-capture the implementation screenshot each pass — it changes as the main agent edits code.

### 5. Fetch (or reuse) the Figma Reference

Fetch both artifacts for every node: the **screenshot** (`get_screenshot`) and
the **design context** (`get_design_context`). The screenshot is what the
vision layer compares against; the design context is the only structured
source of per-element properties, and step 7 builds the checklist from it.

`get_design_context`'s description asks for `figma-design-to-code` guidance
first. You do not need it for validation — call the tool anyway.

The Figma reference is immutable for a given node ID during a validation session. It may already be cached on disk from an earlier step; reuse what exists and fetch only the misses rather than calling Figma every pass.

The cache is shared with the implementation step and lives under `/tmp/<feature-slug>/figma-references/`. Two artifacts share one stem — both are pure functions of the reference's identity:

```
/tmp/<feature-slug>/figma-references/figma-ref__<fileKey>__<nodeId-sanitized>__<scale>x.png    # screenshot
/tmp/<feature-slug>/figma-references/figma-ref__<fileKey>__<nodeId-sanitized>__context.txt    # get_design_context output
```

Sanitize the `nodeId` by replacing `:` with `-` (node IDs contain a colon; colons are not safe in filenames). `context.txt` holds the raw `get_design_context` output — reference code (with design values embedded) and asset URLs the implementation was built from. The filename is the cache key — no separate index file.

Example — fileKey `aBcD1234`, nodeId `1:23`, scale `2x`, feature slug `checkout-redesign`:

```
/tmp/checkout-redesign/figma-references/figma-ref__aBcD1234__1-23__2x.png
/tmp/checkout-redesign/figma-references/figma-ref__aBcD1234__1-23__context.txt
```

**Cache lookup each pass** — reuse anything left by the implementation step; fetch and save only what's missing:

```bash
STEM="/tmp/${SLUG}/figma-references/figma-ref__${FILE_KEY}__${NODE_ID//:/-}"
PNG="${STEM}__${SCALE}x.png"
CTX="${STEM}__context.txt"

# Screenshot: reuse if cached, else call get_screenshot(fileKey, nodeId) and save the PNG to $PNG
[ -f "$PNG" ] && echo "reuse $PNG" || echo "fetch get_screenshot → save to $PNG"

# Design context: reuse if cached, else call get_design_context(fileKey, nodeId) and save the JSON to $CTX
[ -f "$CTX" ] && echo "reuse $CTX" || echo "fetch get_design_context → save to $CTX"
```

`/tmp` clears on process restart and cloud sessions always start with a fresh `/tmp` — no explicit invalidation needed.

### 6. Run the Pixel Diff

Run the vendored helper — it resolves `pngjs`/`pixelmatch` from the runtime (or installs them once into a shared `/tmp` dir on first use), resizes the implementation to the Figma frame, and writes the diff mask:

```bash
scripts/pixel-diff.mjs <impl.png> <figma-ref.png> <out-mask.png> [threshold=0.15]
```

> Script path is relative to the skill's base directory provided when you load the skill.

| Argument | Required | Notes |
|----------|----------|-------|
| impl.png | Yes | Implementation screenshot |
| figma-ref.png | Yes | Figma reference; its dimensions are the canonical size |
| out-mask.png | Yes | Save to `/tmp/quality-assurance/<feature-slug>/ui-validation/pixelmatch-diff__<nodeId-sanitized>.png` |
| threshold | No | Defaults to `0.15`; the `0.10–0.15` range absorbs sub-pixel font-hinting noise (headless Chrome vs. Figma exporter) |

Example:

```bash
node scripts/pixel-diff.mjs \
  /tmp/quality-assurance/checkout-redesign/ui-validation/checkout-step1.png \
  /tmp/checkout-redesign/figma-references/figma-ref__aBcD1234__1-23__2x.png \
  /tmp/quality-assurance/checkout-redesign/ui-validation/pixelmatch-diff__1-23.png
```

The script prints a JSON line — read it to continue: `{ "numDiff": 4213, "pct": 2.04, "width": 760, "height": 272 }`. Record `pct` and the differing pixel count. The helper handles the dimension mismatch (nearest-neighbour resize, no `canvas`) and the `pixelmatch` v7 ESM interop internally, so you do not need to manage module resolution yourself.

"Pixel parity" is judged on the **overall `pct`** the script reports — the share of pixels that differ — not on byte-identical images. The `threshold` is a per-pixel sensitivity knob fed to `pixelmatch` (how different a single pixel's channels must be to count as changed); `pct` is the aggregate you assess.

`pct` is an **inspection trigger, not a pass/fail gate**. A low-single-digit `pct` is normal — sub-pixel font hinting alone scatters changed pixels across every glyph. When `pct` rises into the low single digits, open the diff mask and resolve each distinct cluster on its own: name the element it sits on and the property that explains it. A cluster is rendering noise only if it is a thin halo along a glyph or edge — anything solid or element-shaped is a finding until measured. Do not treat any single percentage as the verdict.

### 7. Validate Against Criteria

Build the checklist from the design context: every element it lists, and the
properties it declares for each. Items named in the brief are added on top —
they are examples, never the full list.

**Deterministic layer — judge on computed values, report the actionable numbers:**

1. **Layout** — see Judgment model. Report pixel deltas against Figma node dimensions; use the diff mask to direct attention to visually divergent regions.
2. **Colors** — see Judgment model. Report actual hex codes in findings (e.g., "button background is `#2563EB`, Figma shows `#1D4ED8`").
3. **Borders & Radii** — pull `border-radius`, `border-width`, `border-color` from `getComputedStyle`.
4. **Text metrics** — see Judgment model. Report actual values against the design context's typography spec.

**Vision layer — judge by inspecting implementation + reference + diff mask together:**

5. **Type rendering** — see Judgment model.
6. **Assets** — images, icons, illustrations rendering correctly.
7. **Overall visual consistency** — review the diff mask for regions flagged as different that computed styles did not catch.

### 8. Validate Interactive States

Drive interactions to reach states that need validating — hover, focus, active, disabled, open/closed modals, form errors, etc. Capture a screenshot at each meaningful interaction state.

### 9. Check for Errors

After exercising the UI, review console output and network activity for unexpected failures.

## Output

```
## UI Validation Report

### Criteria Results
- [criterion]: PASS / FAIL — [specific finding, e.g. "gap between heading and subtext is 24px, expected 16px"]

### Console Errors
- [any unexpected errors observed, or "None"]

### Network Failures
- [any failed requests, or "None"]

### Overall Verdict
PASS / FAIL
```

The Overall Verdict is PASS only if **both layers** pass. A high `pct` never forces FAIL on its own — only an unexplained real divergence, confirmed by the deterministic layer or the vision pass, does.

Be specific. "Button label is `#1A1A1A`, Figma shows `#000000`" is better than "color is slightly off". Include screenshots as evidence for each failure.

Return all screenshot files to the main agent alongside the report — implementation screenshots, Figma reference screenshots, and pixelmatch diff masks. Provide the full file paths so the main agent can access them directly.
