---
name: record-a-demo
description: Records a polished, human-paced video walkthrough of an already-built, QA'd feature so it can be reviewed, signed off on, or shared with a colleague. Use when asked to "record a demo of X", "record a demo of what you just worked on", or to show how a flow works end to end. This is a presentation of working software — not pass/fail testing.
---

# Record a Demo

> All paths are relative to the skill's base directory provided when you load the skill.

This skill produces a **video** of someone using the app, going through one or
more scenarios, the way a person would present a finished feature to an
audience. The premise is that the work is **already done and QA'd** — you are
not testing whether it works, you are *showing* it working so the reviewer can
sign off or request changes. It is also multipurpose: use it whenever the goal
is to show how something already works to a colleague.

**This is a demo, not QA.** Do not narrate a checklist of assertions, do not
hunt for bugs, do not produce a pass/fail verdict. Move through the app
deliberately, as if someone is watching and following along.

---

## Before you start

1. **Read the scratch pad.** Invoke `/agent-scratch-pads` to pick up hints from
   prior runs. You are actively driving the app, so **contribute back** as you
   discover things worth noting.

2. **Read the authentication & transport reference.** The
   [authentication & transport reference](references/authentication-and-transport.md)
   defines transport selection (headless vs attached), the pre-flight check for
   attached sessions, and every browser and API auth flow. You must read this
   before any work. This is mandatory and must not be skipped.

3. **Learn how to drive the browser.** Read the
   [playwright-cli manual](references/playwright-cli.md) — the tool manual for
   every browser interaction (locator/refs gotchas, input handling, storage
   state).

---

## Workflow

### 1. Resolve the scenarios

Scenarios can come from anywhere. Resolve them in this priority order:

1. **Explicit instruction** — a specific flow or "kind of demo" you were asked
   for (e.g. "demo how authentication works", "show the payment checkout").
2. **A named source read for content only** — a test plan, a technical spec, or
   a curated plan the user points at. Extract the scenarios from it; ignore any
   pass/fail framing.
3. **The work just done in context** — when asked to "record a demo of what you
   just worked on", derive the scenarios from the feature you implemented.

### 2. Confirm a short outline, then record

Draft a brief **3–6 step outline** of what the demo will show and present it to
the user for a quick confirm or edit before recording. This is the one
checkpoint — cheap insurance that the demo matches intent. Once confirmed,
proceed without further check-ins.

### 3. Explore the flow (playwright-cli)

Drive the app interactively with **`playwright-cli`** to confirm the real flow
*before* you record anything — this reconnaissance is what tells the recording
script exactly what to target. Nail down: the entry URL, the auth steps, the
exact locators, any waits or dynamic content, and the **bounding box** of any
element you'll anchor a label to (`--raw eval "el => JSON.stringify(el.getBoundingClientRect())" <ref>`).
Capture the working selectors and steps (the scratch pad is a good place for
these). See the [playwright-cli manual](references/playwright-cli.md) for the
command set.

### 4. Author and run the recording script

The demo is recorded by a `page.screencast` script that re-performs the flow you
just confirmed. The exploration is what the script is built from — its locators,
its actions, its label-anchor boxes. Run in one process, the script drives a
**synthetic cursor** the viewer can follow, inserts natural pauses between
actions, and adds occasional **small colour-coded labels** via the
`page.screencast` API.

1. **From the exploration**, take the locators, actions, and label-anchor
   boxes you noted in step 3 — that's the script's target list.
2. **Write the script to a file** under the feature dir. Inject the synthetic
   cursor and drive it with `show()` / `glide()`; type with
   `pressSequentially({ delay: ~60 })` and pause with `waitForTimeout`. Keep
   overlays **small, colourful and contextual** — short colour-coded labels
   placed at the action via `showOverlay` (no outline boxes, no full-page chapter
   cards). See **Recording techniques** for the full mechanics.
3. **Run it:** start the browser daemon once with `playwright-cli open`, then
   `playwright-cli run-code --filename=/tmp/demos/<feature-slug>/perform.js`. The
   script file must start with the bare `async page =>` (no leading comment) and
   be ASCII-only.

> **Lighter alternative.** For a throwaway clip where authoring a script isn't
> worth it, you can skip it and drive natively with recording on (`video-start`
> → steps → `video-stop`, `video-show-actions` for callouts). Use this only for a
> rough capture — the script is the method for a demo meant for sign-off. See
> **Quick native capture** below.

### 5. Verify the take before delivering

You captured **key-beat screenshots** during the run (see techniques). Review
them to confirm the flow rendered correctly — the synthetic cursor is visible and
on target, each beat reached its expected state, no error screens, content
loaded. Note that `page.screenshot()` captures the cursor (it's DOM) but **not**
the screencast overlays (those live in the video layer) — to check an overlay,
extract a frame from the `.webm` with the bundled ffmpeg (see below). If the take
is visually wrong, re-record. Only deliver a take you have eyes-on confirmed.

### 6. Deliver

Save the final `.webm` under the convention path (below) and **surface it to
the user** using whatever file-delivery capability is available in the session,
alongside a short summary: which scenarios were demoed, the outline followed,
and the file path(s). Invite sign-off or modification requests. Do not block on
a tool that may not exist — if no delivery capability is available, report the
paths plainly.

---

## Clip structure — group intelligently

When a demo spans multiple scenarios, decide structure by **narrative
coherence**, not a fixed rule:

- Scenarios that share state or form one continuous journey → record as **one
  continuous take**.
- Independent scenarios that don't flow into each other → record as
  **separate clips**, one per scenario.

Use judgment. A sign-in → dashboard → editor → action sequence is one journey.
"How auth works" and "how checkout works" are two separate clips.

---

## When a take doesn't go cleanly

The premise is that the feature works. Reality sometimes disagrees:

- **Flaky / transient** (a missed wait, a stale locator, a timing blip) →
  silently re-take. These are recording problems, not feature problems.
- **A real regression** (the feature is actually broken) → **stop**. Do **not**
  deliver a misleading "it works" video, and do **not** fix the
  implementation — this is record-a-demo, not implement. Report exactly what
  failed and where, and let the user decide.

---

## Output convention

All demo artifacts go under a namespaced, per-feature directory:

```
/tmp/demos/<feature-slug>/
  <scenario-slug>.webm                 # the demo video(s)
  <scenario-slug>__<beat>.png          # key-beat verification screenshots
```

Derive `<feature-slug>` the same way the scratch-pad skill does: the spec
filename without extension, or a kebab-case name from the task description.
`<beat>` is a short kebab-case label for the moment (e.g. `post-login`,
`dashboard`, `chat-panel-open`, `message-sent`). Create the directory if it
does not exist. Output is **`.webm` only** — there is no system ffmpeg capable
of mp4, and Playwright's bundled ffmpeg is webm-only by design.

---

## Recording techniques

The demo is recorded by a `page.screencast` script. A **synthetic cursor** the
viewer can follow carries the demo; small **colour-coded** screencast labels add
the occasional caption of what's happening. Both are captured in the recording.

### Synthetic cursor + click ripple

Headless video renders **no real mouse cursor**, so a viewer can't see where the
action is. Inject a DOM cursor via `page.addInitScript` (re-runs on every
navigation) and drive it alongside the real Playwright mouse so genuine
hover/click events still fire.

Two things make this robust in practice: drive the app with **real navigations
(`page.goto`)**, not `page.setContent` — setContent replaces the body *after* the
init script runs and wipes the appended cursor. And guard the mount with a
`MutationObserver` + an `ensure()` that re-appends the dot if a SPA re-render
removes it, persisting the last position so it reappears where it was.

```js
await page.addInitScript(() => {
  window.__cursor = window.__cursor || { x: 0, y: 0 };
  const ensure = () => {
    if (document.getElementById('__demo_cursor') || !document.body) return;
    const dot = document.createElement('div');
    dot.id = '__demo_cursor';
    Object.assign(dot.style, {
      position: 'fixed', left: window.__cursor.x + 'px', top: window.__cursor.y + 'px',
      width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px',
      borderRadius: '50%', background: 'rgba(20,20,20,0.35)',
      border: '2px solid rgba(255,255,255,0.95)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      zIndex: '2147483647', pointerEvents: 'none',
      transition: 'left 40ms linear, top 40ms linear',
    });
    document.body.appendChild(dot);
  };
  const start = () => {
    ensure();
    new MutationObserver(ensure).observe(document.documentElement,
      { childList: true, subtree: true });
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
  window.__moveCursor = (x, y) => {
    window.__cursor = { x, y };
    const dot = document.getElementById('__demo_cursor');
    if (dot) { dot.style.left = x + 'px'; dot.style.top = y + 'px'; }
  };
  window.__ripple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: '8px',
      height: '8px', marginLeft: '-4px', marginTop: '-4px', borderRadius: '50%',
      border: '2px solid rgba(60,130,255,0.9)', zIndex: '2147483646',
      pointerEvents: 'none', transition: 'all 350ms ease-out',
    });
    document.body.appendChild(r);
    requestAnimationFrame(() => {
      r.style.width = '44px'; r.style.height = '44px';
      r.style.marginLeft = '-22px'; r.style.marginTop = '-22px';
      r.style.opacity = '0';
    });
    setTimeout(() => r.remove(), 400);
  };
});
```

Drive it with paced primitives — glide between targets and ripple on click, so
the cursor does the explaining and overlays stay rare:

```js
const pause = (ms) => page.waitForTimeout(ms);

// Glide the cursor to a point, moving the real mouse too so hover fires.
async function glide(x, y, steps = 24) {
  const from = await page.evaluate(() => window.__cursor || { x: 0, y: 0 });
  for (let i = 1; i <= steps; i++) {
    const nx = from.x + (x - from.x) * (i / steps);
    const ny = from.y + (y - from.y) * (i / steps);
    await page.mouse.move(nx, ny);
    await page.evaluate(([nx, ny]) => window.__moveCursor(nx, ny), [nx, ny]);
    await page.waitForTimeout(16);
  }
}

// Move to an element by role+name, ripple, then click — resolve at action time.
async function show(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await glide(x, y);
  await pause(250);
  await page.evaluate(([x, y]) => window.__ripple(x, y), [x, y]);
  await locator.click();
}

// A key beat: settle, screenshot for verification, give the viewer a moment.
async function beat(name, settleMs = 1600) {
  await pause(settleMs);
  await page.screenshot({ path: `${DIR}/${SLUG}__${name}.png` });
}
```

### The recording script

Author one function and run it with `playwright-cli run-code --filename script.js`.
The argument is a single `async page => { ... }` (no import/require) — the cursor
injection and the helpers above live inside this same function. Inject the cursor
first, navigate to the entry screen and let it settle, start the screencast, then
open with a cursor move (see *Open with motion* below), and perform the flow with
`show()` / `glide()`. Overlays are `pointer-events: none`, so they never block
interaction.

> **Two `run-code --filename` gotchas (both bite on the first run):**
> 1. **The file must begin with the bare `async page =>`** — a leading comment,
>    blank line, or any non-ASCII character before it makes the parser choke
>    (e.g. `Unexpected token ';'`). Keep all comments *inside* the function body,
>    and keep the whole file ASCII.
> 2. **Open the browser daemon first.** `run-code --filename` runs against the
>    live daemon page, so call `playwright-cli open` once before it, or it errors
>    `Browser 'default' is not open`.

```js
// /tmp/demos/<feature-slug>/perform.js — run: playwright-cli run-code --filename=/tmp/demos/<feature-slug>/perform.js
async page => {
  const DIR = '/tmp/demos/<feature-slug>', SLUG = '<feature-slug>';
  await page.addInitScript(/* synthetic cursor — see "Synthetic cursor" above */);
  const pause = (ms) => page.waitForTimeout(ms);
  async function glide(x, y, steps = 24) { /* … see above … */ }
  async function show(locator) { /* glide → ripple → click — see above */ }
  async function beat(name, ms = 1600) { await pause(ms); await page.screenshot({ path: `${DIR}/${SLUG}__${name}.png` }); }

  // Load and SETTLE the entry screen BEFORE recording starts, so frame one is the
  // fully rendered page (no half-painted load flash).
  await page.goto('https://app.example.com/login');
  await page.getByRole('textbox', { name: 'Email' }).waitFor({ state: 'visible' });

  await page.screencast.start({ path: `${DIR}/<scenario-slug>.webm`, size: { width: 1280, height: 800 } });

  // Open with a cursor move, not a static hold (see "Open with motion").
  await show(page.getByRole('textbox', { name: 'Email' }));   // cursor glides in immediately
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially('user@example.com', { delay: 60 });
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially('secret', { delay: 60 });
  await show(page.getByRole('button', { name: 'Sign in' }));   // cursor glides → ripple → click
  await page.waitForURL('**/dashboard');
  await beat('post-login');                                     // key-beat screenshot

  // A small COLOUR pill placed AT the action — no outline box (the cursor shows
  // where), no full-page card. Anchored from the target's box.
  const wb = await page.getByText('Welcome back').boundingBox();
  await page.screencast.showOverlay(
    `<div style="position:absolute;top:${wb.y - 34}px;left:${wb.x}px;padding:8px 14px;
      border-radius:10px;background:rgba(17,24,39,0.85);color:#fff;font-size:13px;
      box-shadow:0 4px 14px rgba(0,0,0,0.25);">Your dashboard</div>`,
    { duration: 1800 });

  // ... continue the flow with show()/glide(), capturing beats ...

  await page.screencast.stop();   // finalizes the .webm at the path above
}
```

Overlay API: `showOverlay(html, { duration? })` for labels/callouts
(returns a disposable when no `duration` is given); `showChapter(title, { description?, duration?, styleSheet? })`
for a full-page section card; `hideOverlays()` / `showOverlays()` to toggle. The
script writes the `.webm` directly to the path in `screencast.start`/`stop` — no
random-name rename step.

**Annotate with small, colourful, contextual labels — not boxes or full-page
cards.** The cursor shows *where* the action is; a label adds *what's happening*
and *what state it's in*. Keep them small, place them at the action, and let
colour do the talking.

- **Small colour pills, placed at the action.** A short text label — ~13–14px,
  `padding: 8px 14px`, `border-radius: 10px` (or `999px` for a pill), white text,
  a soft shadow `0 4px 14px rgba(0,0,0,0.25)` — positioned from the target's
  `boundingBox()` so it sits right by what's happening (e.g. a status pill just
  above the chat input), not pinned to a generic corner. Background alpha
  ~0.85–0.92 so it sits *on* the UI without hiding it.
- **Encode state in colour** so the clip reads with the sound off and the text
  unread: neutral/context → slate `rgba(17,24,39,0.85)`; in-progress/working →
  your app's primary hue or indigo `rgba(79,70,229,0.92)`; done/success →
  emerald `rgba(16,185,129,0.92)` with a ✓.
- **Track the action's lifecycle.** For something that runs — a streaming reply,
  a save — show the in-progress pill as a disposable, keep it up while it runs,
  then `dispose()` it the moment your completion signal fires and flash a short
  success label (`{ duration: ~2400 }`). The **working→done colour shift** (an
  indigo pill while it streams → a green "✓ done" when it settles) is the single
  highest-leverage annotation: it tracks the one state change that matters.

**Don't:** draw outline boxes around elements (the cursor already shows where the
action is); pin every label to one corner (reads as static chrome bolted to the
frame); or blur the whole page with a `showChapter` card. A full-page card is a
hard interrupt that halts all motion — use one *at most* as a title card on a
cold open, never mid-flow. Let the cursor, pacing, and a few well-placed colour
pills do the narrating.

### Quick native capture (alternative)

For a throwaway clip where authoring a script isn't worth it, drive the flow with
recording on — no script.

Recording rolls in real time, so it captures the latency between commands and
can't finely pace typing — fine for a rough capture, not for a sign-off demo.
Insert pauses with `run-code "async page => { await page.waitForTimeout(900); }"`,
and capture key-beat screenshots with `screenshot --filename=` as verification
evidence.

### Open with motion — no frozen start

The most common way a demo opens badly isn't a blank frame — it's a **rendered
page that sits motionless** for the first beat or two. The screen is correct, but
nothing moves, so those opening seconds read as a screenshot or a frozen/hung
tab, and the viewer can't tell the recording is live until something finally
happens. The fix is to put **visible motion on screen almost immediately** after
recording starts:

- **Lead with a cursor move, not a pause.** Don't follow `screencast.start()` with
  a static `waitForTimeout` on the still page. Make the first thing after `start()`
  a `glide()`/`show()` onto the first target so the cursor visibly travels in
  right away. Motion in the first ~300–500ms is what tells the viewer it's live.
- **Don't start typing or acting while the cursor sits parked.** Typing into a
  field the cursor never moved to still looks half-frozen — glide to the target
  first, then act.
- **Keep any pre-action settle minimal.** A short hold to avoid opening mid-jump
  is fine, but a multi-second motionless hold at the top is the frozen look to
  avoid. Absorb-the-screen pauses belong at *later* beats (`beat()`), not before
  the first action.
- **Have the page rendered before recording starts.** `goto` the entry URL and
  `waitFor` a key element **before** `screencast.start()` (as the sample does),
  so the open isn't also fighting a half-painted load — then lead in with motion.

### Pacing

The human feel comes mostly from **deliberate pauses between actions**, not from
dragging out the typing. A *moderate* per-character delay reads as natural typing —
`pressSequentially({ delay: ~60 })` — so don't crank the delay higher to seem
"human", and use `fill` when the typing itself isn't the point. Target
~800–1200ms between ordinary steps and ~1500–2500ms at key beats so the viewer can
absorb a new screen. Don't add latency for its own sake — pace it like a confident
presenter, not a slideshow.

### Streaming UIs (SSE / websockets)

Apps with a long-lived streaming connection — an AI chat that streams its reply
over SSE, a live agent loop — are fine to demo **in full**. The recording
captures the page continuously in real time, so the whole generation is recorded
as it happens. Showing the complete response is the goal — do **not** truncate or
cut the stream short. What you must avoid is a *blocking* call that stalls on a
static screen — the stall, not the stream's length, is the glitch.

- **Don't wait for network-idle — that's the actual trap.** A streaming
  connection stays open, so network-idle never arrives:
  `page.waitForLoadState('networkidle')` and `goto`/`waitFor` with
  `waitUntil: 'networkidle'` block until they time out. Plain `page.screenshot()`
  and `page.evaluate()` do **not** block during a stream (a default screenshot
  mid-stream returns in ~120ms), so don't reach for `{ timeout: 0 }` hacks; just
  never gate on the network settling. To pace during generation, wait on a DOM
  condition or a bounded `waitForTimeout`.
- **Advance on a real completion signal, not a fixed sleep.** Poll a DOM signal
  that the stream has finished, with a **generous timeout** sized for a long
  generation. The most portable signal is the **response text holding steady** —
  the response container's text length is unchanged across a couple of
  consecutive polls, having grown past its pre-send size. An in-progress
  affordance clearing (a "Stop" / "Generating…" control disappearing) is a useful
  secondary hint, but **don't rely on a send/submit button re-enabling**: it may
  stay disabled in both the idle (empty input) and generating states, so it
  can't distinguish them. This lets the full response stream into the recording,
  then continues the moment it completes.
- **Don't sit on a static screen.** A streaming reply is visible motion, so it
  never looks frozen while generating. Once it settles, move on promptly rather
  than lingering on a finished, motionless frame.

A stream is the ideal place for the **working→done colour pill** (see
*Recording techniques*): show an in-progress pill anchored at the input while it
generates, then flip it to a success pill on the completion signal.

### Verifying without watching

You can't casually watch a webm. The key-beat screenshots are the primary check.
If you need to inspect the actual video content — for instance to confirm a
screencast overlay, which beat screenshots don't capture — Playwright's bundled
ffmpeg (`/opt/pw-browsers/ffmpeg-*/ffmpeg-linux`) decodes VP8 → PNG (it's
webm-only but does decode). Extract a few frames and look:

```bash
FFM=$(ls /opt/pw-browsers/ffmpeg-*/ffmpeg-linux | head -1)
"$FFM" -y -i clip.webm -ss 4 -frames:v 1 frame.png   # accurate seek: -ss AFTER -i
"$FFM" -y -i clip.webm -update 1 last.png            # last frame (overwrites each frame)
```

The build is `--disable-everything`, so the `select`/`fps` filters aren't
available — seek with `-ss` (placed *after* `-i` for frame-accuracy) instead.

---

## Summary of what makes this a demo

- Confirmed outline up front, then a smooth uninterrupted performance.
- A clean open that leads in with cursor motion, not a motionless hold.
- Natural pacing, a visible synthetic cursor, small colour-coded labels only where they help, deliberate pauses at the beats that matter.
- One clip or several, grouped by how the scenarios actually flow.
- A finished `.webm` surfaced for sign-off — not a verdict, not a bug hunt.
