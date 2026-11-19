---
name: record-a-demo
description: Records a polished, human-paced video walkthrough of an already-built, QA'd feature so it can be reviewed, or shared with a colleague. Use when asked to "record a demo of X", "record a demo of what you just worked on", or to show how a flow works end to end.
---

# Record a Demo

> All paths are relative to the skill's base directory provided when you load the skill.

This skill produces a **video** of someone using the app, going through one or
more scenarios, the way a person would present a finished feature. The work is
**already done and QA'd**: you are *showing* it working so a reviewer can sign
off or request changes, not testing it. Use it whenever the goal is to show a
colleague how something already works.

**This is a demo, not QA.** No checklist of assertions, no bug hunting, no
pass/fail verdict. Move through the app deliberately, as if someone is watching
and following along.

---

## Before you start

1. **Read the scratch pad.** Invoke `/agent-scratch-pads` to pick up hints from
   prior runs. You are actively driving the app, so **contribute back** as you
   discover things worth noting.

2. **Read the authentication & transport reference.** The
   [authentication & transport reference](references/authentication-and-transport.md)
   defines transport selection (headless vs attached), the pre-flight check for
   attached sessions, and every browser and API auth flow. Read it before any
   work.

3. **Learn how to drive the browser.** Read the
   [playwright-cli manual](references/playwright-cli.md) — the tool manual for
   every browser interaction (locator/refs gotchas, input handling, storage
   state).

---

## Workflow

### 1. Resolve the scenarios

Take them from, in priority order: an explicit instruction ("demo how
authentication works"); a named source such as a test plan or spec, read for
content only (ignore any pass/fail framing); or the work just done in context.

### 2. Confirm a short outline, then record

Draft a brief **3–6 step outline** of what the demo will show and present it to
the user for a quick confirm or edit. This is the one checkpoint. Once
confirmed, proceed without further check-ins.

### 3. Explore the flow (playwright-cli)

Drive the app interactively with **`playwright-cli`** to confirm the real flow
*before* you record anything. Nail down the entry URL, the auth steps, the exact
locators, any waits or dynamic content, and the **bounding box** of any element
you'll anchor a label to
(`--raw eval "el => JSON.stringify(el.getBoundingClientRect())" <ref>`). Note
the working selectors and steps (the scratch pad is a good place).

### 4. Author and run the recording script

The demo is recorded by a `page.screencast` script that re-performs the flow you
just confirmed, using its locators, actions and label-anchor boxes. It drives a
**synthetic cursor** the viewer can follow, pauses naturally between actions, and
adds occasional small colour-coded labels. See **Recording techniques**.

1. Write the script to a file under the feature dir. It must start with the bare
   `async page =>` and be ASCII-only.
2. Start the browser daemon once with `playwright-cli open`, then run
   `playwright-cli run-code --filename=/tmp/demos/<feature-slug>/perform.js`.

> **Lighter alternative.** For a throwaway clip, skip the script and drive
> natively with recording on (`video-start` → steps → `video-stop`,
> `video-show-actions` for callouts). Recording rolls in real time, so it
> captures command latency and can't pace typing: fine for a rough capture,
> not for a sign-off demo.

### 5. Deliver

Save the final `.webm` under the convention path (below), convert it to `.mp4`,
and **surface the `.mp4` to the user** with whatever file-delivery capability the
session has, alongside a very short summary. Don't restate all that was done.

---

## Clip structure

Scenarios that share state or form one journey (sign-in → dashboard → editor →
action) are **one continuous take**. Independent scenarios ("how auth works",
"how checkout works") are **separate clips**.

## When a take doesn't go cleanly

- **Flaky / transient** (a missed wait, a stale locator, a timing blip) →
  silently re-take. These are recording problems, not feature problems.
- **A real regression** (the feature is actually broken) → **stop**. Do not
  deliver a misleading "it works" video, and do not fix the implementation (this
  is record-a-demo, not implement). Report exactly what failed and where, and let
  the user decide.

## Output convention

```
/tmp/demos/<feature-slug>/
  <scenario-slug>.webm   # the demo video(s)
```

Derive `<feature-slug>` from the spec name
without extension, or a kebab-case name from the task description. Convert the `.webm` to an H.264 `.mp4` and deliver that (Playwright's ffmpeg can't; use the one from Python's `imageio-ffmpeg` package).

---

## Recording techniques

### Synthetic cursor + click ripple

Headless video renders **no real mouse cursor**, so inject a DOM cursor via
`page.addInitScript` (re-runs on every navigation) and drive it alongside the
real Playwright mouse so genuine hover/click events still fire.

Two things make it robust: drive the app with **real navigations (`page.goto`)**,
not `page.setContent`, which replaces the body *after* the init script runs and
wipes the cursor. And guard the mount with a `MutationObserver` + an `ensure()`
that re-appends the dot if a SPA re-render removes it, persisting the last
position.

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

Drive it with paced primitives: glide between targets and ripple on click, so
the cursor does the explaining and overlays stay rare.

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

// Move to an element, ripple, then click. Resolve the locator at action time.
async function show(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await glide(x, y);
  await pause(250);
  await page.evaluate(([x, y]) => window.__ripple(x, y), [x, y]);
  await locator.click();
}
```

### The recording script

One `async page => { ... }` (no import/require), run with
`playwright-cli run-code --filename script.js`. The cursor injection and helpers
above live inside it. Inject the cursor, navigate to the entry screen and let it
settle, start the screencast, then perform the flow with `show()` / `glide()`.
Overlays are `pointer-events: none`, so they never block interaction.

> **Two `run-code --filename` gotchas (both bite on the first run):**
> 1. **The file must begin with the bare `async page =>`.** A leading comment,
>    blank line, or any non-ASCII character before it makes the parser choke
>    (e.g. `Unexpected token ';'`). Keep comments *inside* the function body and
>    the whole file ASCII.
> 2. **Open the browser daemon first.** `run-code --filename` runs against the
>    live daemon page, so call `playwright-cli open` once before it, or it errors
>    `Browser 'default' is not open`.

```js
async page => {
  const DIR = '/tmp/demos/<feature-slug>';
  // cursor init script, pause(), glide() and show() go here, copied from above
  await page.addInitScript(/* synthetic cursor */);

  // Load and settle the entry screen BEFORE recording, so frame one is fully rendered.
  await page.goto('https://app.example.com/login');
  await page.getByRole('textbox', { name: 'Email' }).waitFor({ state: 'visible' });

  await page.screencast.start({ path: `${DIR}/<scenario-slug>.webm`, size: { width: 1280, height: 800 } });

  await show(page.getByRole('textbox', { name: 'Email' }));   // cursor glides in immediately
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially('user@example.com', { delay: 60 });
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially('secret', { delay: 60 });
  await show(page.getByRole('button', { name: 'Sign in' }));  // glide → ripple → click
  await page.waitForURL('**/dashboard');
  await pause(1600);                                          // let the viewer absorb the screen

  // A small colour pill placed AT the action, anchored from the target's box.
  const wb = await page.getByText('Welcome back').boundingBox();
  await page.screencast.showOverlay(
    `<div style="position:absolute;top:${wb.y - 34}px;left:${wb.x}px;padding:8px 14px;
      border-radius:10px;background:rgba(17,24,39,0.85);color:#fff;font-size:13px;
      box-shadow:0 4px 14px rgba(0,0,0,0.25);">Your dashboard</div>`,
    { duration: 1800 });

  // ... continue the flow with show()/glide() ...

  await page.screencast.stop();   // finalizes the .webm at the path above
}
```

### Labels

`showOverlay(html, { duration? })` adds labels (it returns a disposable when no
`duration` is given); `showChapter(title, { description?, duration?, styleSheet? })`
adds a full-page card; `hideOverlays()` / `showOverlays()` toggle them. The
cursor shows *where* the action is; a label adds *what's happening* and *what
state it's in*.

- **Small colour pills, placed at the action**, positioned from the target's
  `boundingBox()` (not pinned to a generic corner), with background alpha
  ~0.85–0.92 so they sit on the UI without hiding it.
- **Encode state in colour** so the clip reads with the sound off: neutral →
  slate `rgba(17,24,39,0.85)`; in-progress → indigo `rgba(79,70,229,0.92)`; done →
  emerald `rgba(16,185,129,0.92)` with a ✓.
- **Track the lifecycle** of anything that runs (a streaming reply, a save): keep
  the in-progress pill up while it runs, `dispose()` it when your completion
  signal fires, and flash a short success label (`{ duration: ~2400 }`). The
  working→done colour shift is the highest-leverage annotation.

**Don't** draw outline boxes (the cursor already shows where), pin every label to
one corner, or use a `showChapter` card mid-flow: it halts all motion. At most,
use one as a title card on a cold open.

### Open with motion

A rendered page that sits motionless reads as a frozen tab. Put motion on screen
immediately:

- Make the first thing after `screencast.start()` a `glide()`/`show()` to the first target, not a pause.
- Glide to a field before typing into it; typing while the cursor sits parked looks half-frozen.
- Render the entry page before recording starts (`goto`, then `waitFor` a key element) so the open isn't a half-painted load.
- Keep any pre-action settle minimal; longer pauses belong at later beats.

### Pacing

The human feel comes from **deliberate pauses between actions**, not slow typing.
Use `pressSequentially({ delay: ~60 })` (or `fill` when the typing isn't the
point), ~800–1200ms between ordinary steps, and ~1500–2500ms at key beats.

### Streaming UIs (SSE / websockets)

Demo a streaming reply **in full**: the recording captures it in real time, so
don't truncate it. What to avoid is a *blocking* call that stalls on a static
screen.

- **Never wait for network-idle.** A streaming connection stays open, so
  `waitForLoadState('networkidle')` and `waitUntil: 'networkidle'` block until
  they time out. `page.screenshot()` and `page.evaluate()` don't block mid-stream.
- **Advance on a real completion signal**, with a generous timeout. The most
  portable one is the response container's text length holding steady across a
  couple of polls, having grown past its pre-send size. An in-progress control
  disappearing ("Stop", "Generating…") is a useful hint. Don't rely on a send
  button re-enabling: it may stay disabled in both idle and generating states.
- Once the stream settles, move on rather than lingering on a motionless frame.

### Inspecting the video

`page.screenshot()` captures the cursor (it's DOM) but **not** screencast
overlays (they live in the video layer). To check an overlay, extract a frame
with Playwright's bundled ffmpeg, which decodes the webm:

```bash
FFM=$(ls /opt/pw-browsers/ffmpeg-*/ffmpeg-linux | head -1)
"$FFM" -y -i clip.webm -ss 4 -frames:v 1 frame.png   # accurate seek: -ss AFTER -i
```

The build is `--disable-everything`, so filters like `select`/`fps` aren't
available.
