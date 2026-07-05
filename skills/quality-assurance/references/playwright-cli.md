# Driving the browser with playwright-cli

This is the **tool manual** for browser work. Read it whenever you drive a browser
for QA or a demo. Every action is a `playwright-cli` command run through Bash, and
you keep full in-the-loop steering: `snapshot → observe → act → re-snapshot`.

> `playwright-cli --help` and `playwright-cli --help <command>` are authoritative
> when you hit something not covered here.

## Mental model

`playwright-cli` runs a **persistent browser daemon**. Commands in sequence act on
the same live page — `open` once, then `goto` / `snapshot` / `click` / `fill`
across many separate Bash calls, then `close`. State (cookies, storage, the open
tab) survives between commands until you `close`.

```bash
playwright-cli open                       # launch (headless by default)
playwright-cli goto https://example.com   # navigate
playwright-cli snapshot                    # read structure → returns refs (e15, ...)
playwright-cli click e15                    # act
playwright-cli snapshot                    # re-read after the DOM changes
playwright-cli close                        # tear down
```

`open` is **headless by default** — no painted window, but full interactive
control. Add `--headed` only when you explicitly need a visible window.

### Named sessions

Run isolated browsers in parallel with `-s=<name>` (independent cookies, storage,
tabs). Omit `-s` to use the `default` session.

```bash
playwright-cli -s=auth open https://app.example.com/login
playwright-cli -s=public open https://example.com
playwright-cli list          # list sessions
playwright-cli close-all      # close every session
playwright-cli kill-all       # force-kill stale/zombie daemons
```

## Targeting elements — refs vs. role+name

`snapshot` returns positional refs (`e15`). **Default to refs** — `click e15`,
`fill e7 "..."` — they are the natural flow and work the large majority of the
time.

**Refs are a snapshot of one moment.** They go stale when the page re-renders
(validation, hydration, controlled inputs, SPA route changes), producing
"ref no longer exists / invalid" errors. **When a ref fails or behaves
unstably, switch that interaction to a role+name locator**, which re-resolves
against the live DOM at action time:

```bash
playwright-cli click "getByRole('button', { name: 'Submit' })"
playwright-cli fill  "getByRole('textbox', { name: 'Email' })" "user@example.com"
playwright-cli click "getByTestId('submit-button')"
playwright-cli click "#main > button.submit"          # css selector also works
```

This also rescues custom components: if `select e9 "value"` fails on a
Radix/shadcn dropdown that isn't a native `<select>`, open it with a role+name
`click` and pick the option by role+name.

Re-`snapshot` after any failed `fill`/`type` before reusing refs — focus or the
DOM may have shifted.

**Two strikes rule.** If the same command fails twice with the same error, stop
and report. Do not iterate on permutations.

## Interacting

```bash
playwright-cli fill e5 "user@example.com"          # preferred over per-char typing
playwright-cli fill e5 "user@example.com" --submit  # fill then press Enter
playwright-cli type "free text"                      # type into focused element
playwright-cli press Enter                           # keyboard key
playwright-cli click e3
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli check e12 ; playwright-cli uncheck e12
playwright-cli upload ./document.pdf
playwright-cli drag e2 e8
playwright-cli resize 1280 800
playwright-cli dialog-accept ; playwright-cli dialog-dismiss
```

**Input fallback ladder:** `fill` → if it doesn't propagate (controlled inputs
not firing change), `type`/`press` → last resort, set the value directly via
`eval`/`run-code`.

## Reading state & measuring

```bash
playwright-cli snapshot                        # accessibility tree + refs
playwright-cli snapshot "#main"                 # scope to a subtree
playwright-cli snapshot --boxes                 # include [box=x,y,w,h] per element
playwright-cli --raw snapshot > before.yml      # value-only, pipeable
playwright-cli eval "document.title"            # run JS on the page
playwright-cli eval "el => el.textContent" e5   # run JS against an element
playwright-cli screenshot --filename=page.png   # save a screenshot
playwright-cli screenshot e5 --filename=el.png  # element screenshot
playwright-cli console                          # console messages
playwright-cli console error                    # filter by min level
playwright-cli requests                         # list network requests (numbered)
playwright-cli request 5                        # full detail of request #5
```

**Deterministic measurement** (layout/color ground truth for UI validation) goes
through `eval` or `run-code` — pull `getBoundingClientRect` and `getComputedStyle`
off live elements rather than eyeballing a screenshot:

```bash
playwright-cli --raw eval "el => JSON.stringify(el.getBoundingClientRect())" e5
playwright-cli --raw eval "el => getComputedStyle(el).backgroundColor" e5
```

## There is no `wait` command — use `run-code`

`playwright-cli` has no `wait` subcommand. Two things cover synchronization:

1. **Auto-waiting** — `click` / `fill` / `select` already wait for the element to
   be actionable, so you rarely need an explicit wait *before acting*.
2. **Explicit synchronization** — to wait for async UI (a toast to appear, a
   spinner to vanish, content to settle) before reading/screenshotting, use
   `run-code` with a Playwright wait primitive:

```bash
playwright-cli run-code "async page => { await page.getByText('Saved').waitFor(); }"
playwright-cli run-code "async page => { await page.locator('.spinner').waitFor({ state: 'hidden' }); }"
playwright-cli run-code "async page => { await page.waitForFunction(() => window.appReady === true); }"
playwright-cli run-code "async page => { await page.waitForTimeout(800); }"   # fixed pause
```

> Streaming UIs (SSE/websockets) never reach network-idle — don't gate on
> `waitForLoadState('networkidle')` there. Poll a DOM signal instead.

## run-code — arbitrary Playwright

For anything the flat commands don't cover. The argument is a single
`async page => { ... }` function (no import/require). Load larger scripts from a
file with `--filename`.

```bash
playwright-cli run-code "async page => { return await page.title(); }"
playwright-cli run-code --filename=./script.js
```

Common uses: permissions/geolocation (`page.context().grantPermissions([...])`),
media emulation (`page.emulateMedia({ colorScheme: 'dark' })`), downloads,
iframe traversal, multi-step flows.

## Authentication & storage state

Reuse an authenticated session instead of logging in every run:

```bash
# Log in once, save the full state (cookies + localStorage)
playwright-cli open https://app.example.com/login
playwright-cli fill "getByRole('textbox', { name: 'Email' })" "user@example.com"
playwright-cli fill "getByRole('textbox', { name: 'Password' })" "secret"
playwright-cli click "getByRole('button', { name: 'Sign in' })"
playwright-cli state-save auth.json

# Later: restore and skip the login
playwright-cli state-load auth.json
playwright-cli open https://app.example.com/dashboard
```

Cookie / localStorage / sessionStorage have direct subcommands
(`cookie-set`, `localstorage-set`, …); use `run-code` with
`context.addCookies([...])` for bulk operations.

> **Never commit state files** — they hold auth tokens. Write them under `/tmp`
> and delete when done.

## Network mocking

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
playwright-cli unroute            # remove all routes
playwright-cli network-state-set offline
```

## Attaching to an existing browser

When the browser must carry the user's existing third-party session (e.g. Google
SSO), `attach` to a running browser instead of launching a fresh one:

```bash
playwright-cli attach --extension          # via the Playwright browser extension
playwright-cli attach --extension=chrome    # name the browser explicitly
playwright-cli attach --cdp=chrome          # by channel (needs remote debugging enabled)
playwright-cli attach --cdp=http://localhost:9222   # by CDP endpoint
playwright-cli detach                       # tear down WITHOUT closing the user's browser
```

For `--cdp=<channel>` the target browser must have remote debugging enabled
(in Chrome: `chrome://inspect/#remote-debugging` → "Allow remote debugging for
this browser instance"). When `-s` is omitted, the session is named after the
channel. Use `detach` (not `close`) for attached sessions.

## Output modes

- `--raw` — strip status/snapshot framing, emit only the result value (pipe into
  `jq`, redirect to a file, capture in a shell var).
- `--json` — wrap the whole reply as JSON.

```bash
TOKEN=$(playwright-cli --raw cookie-get session_id)
playwright-cli --raw eval "JSON.stringify(performance.timing)" | jq '.loadEventEnd'
```
