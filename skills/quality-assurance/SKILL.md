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

For any browser-driven task, also read the **[playwright-cli manual](references/playwright-cli.md)** — it is the tool manual for every browser interaction.

The caller may pass the feature spec for context. Treat it as background only — the presence of Figma references inside the spec does **not** mean you should run UI validation, and the presence of a test plan does **not** mean you should run scenarios.

---

## Scratch Pad

After reading the reference guide above, invoke `/agent-scratch-pads`. It will guide you through any accumulated notes for the feature or task.

---

## Transport

This skill drives the browser with **`playwright-cli`** (`playwright-cli open` → `snapshot`/`click`/`fill` → `close`), run **headless** by default. For auth requirements and full transport selection, see [Authentication](#authentication) below. Use an **attached** browser (`playwright-cli attach`) only when the task explicitly requires it (i.e., Google SSO or any flow where the browser must carry the user's identity).

---

## Pre-flight check (attached sessions)

When attached to the user's Chrome (`playwright-cli attach`, see [Authentication](#authentication)), snapshot the entry page before any interaction and confirm:

1. Which user (if any) is signed in.
2. Whether that matches the account named in the task.

If they don't match — or if no user is signed in and the task names a specific account — **stop and ask** rather than improvising a manual login. The connected Chrome profile is the source of truth for session state.

---

## Authentication

### Browser tasks (UI validation and browser-driven test plans)

**Default transport: headless `playwright-cli`.** Drive the browser headlessly (`playwright-cli open`, no `--headed`) unless the task explicitly requires an attached browser. "Headless" means no painted window — not blind one-shot scripting. The agent retains full interactive control: navigate, click, fill, hover, focus, drive to error states, improvise when an element is not where expected — each step is a `playwright-cli` command, observed before the next. Deterministic measurement (resize, screenshot, pull computed styles, run pixelmatch) goes through `eval`/`run-code`; interactive state exploration uses the same in-the-loop steering. Both run headless. See the [playwright-cli manual](references/playwright-cli.md) for the commands.

**Attaching is a single-purpose escape hatch.** Use `playwright-cli attach` only when the browser must carry the user's existing third-party session — practically, Google SSO flows. For every other auth scenario, headless is sufficient.

**Transport selection by auth dependency:**

| Scenario | Transport |
|---|---|
| No auth required | Headless `playwright-cli` |
| Email / password credentials | Headless — agent types them |
| OTP, disposable email accepted | Headless + disposable inbox (mailinator or maildrop) |
| OTP, real email required (product blocks disposable email, not Google SSO) | Headless — read OTP via Gmail MCP |
| Google SSO, or any flow where the browser must carry an authenticated third-party session | `playwright-cli attach` only |

Reading an OTP from real Gmail does not require attaching — the OTP arrives through the Gmail MCP tool channel, not the browser session. Attaching is required only when the browser itself must carry the user's identity.

**Credentials in the prompt are informational, not an instruction to log in.** In headless mode the agent types them. In an attached session the connected profile may already hold the session — run the pre-flight check first; if not signed in as that user, ask before logging in manually.

**Seed state in the same channel you'll test in.** If the test runs in the browser, create preconditions through the browser UI. Do not authenticate via curl and expect that session to carry into the browser — they are separate sessions, and data created via curl will appear missing from the browser's perspective.

If the specific browser auth flow has not been specified and is needed, **ask before proceeding**:
- Which flow? (Google SSO, Gmail OTP, disposable-inbox OTP (mailinator/maildrop), or other)
- Which email or account to use?

**Google SSO (attach only)** — `playwright-cli attach` to the user's Chrome, click the "Sign in with Google" button, and let the connected browser handle it using the existing Google session. Do not enter credentials manually.

**Gmail OTP (headless)** — trigger the OTP from the app, then use Gmail MCP (`gmail_search_messages`, `gmail_read_message`) to find and read the OTP email. Paste it into the browser and continue.

**Disposable-inbox OTP (headless)** — use a disposable address as the email in the app, then navigate to that provider's public inbox in the browser to read the OTP. Paste and continue. Either provider works:
- **mailinator** — `<username>@mailinator.com`, read at `mailinator.com/v4/public/inboxes.jsp?to=<username>`
- **maildrop** — `<username>@maildrop.cc`, read at `maildrop.cc/<username>`

### API tasks (curl-based scenarios)

For API-only scenarios, authentication is handled via curl before making requests. If the auth method has not been specified, **ask before proceeding**:
- Which method? (Bearer token, cookie-based, or none)
- Which credentials or endpoint to use?

**Bearer token** — obtain a token via the login endpoint, then pass it as a header on subsequent requests:
```bash
TOKEN=$(curl -s -X POST "https://api.example.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.token')

curl -s -X GET "https://api.example.com/endpoint" \
  -H "Authorization: Bearer $TOKEN"
```

**Cookie-based** — the server sets a session cookie via a `Set-Cookie` response header after login. Use `-c` to capture it and `-b` to send it on subsequent requests:
```bash
# Log in — curl saves Set-Cookie headers automatically
curl -s -X POST "https://api.example.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  -c /tmp/cookies.txt

# Inspect headers if needed
curl -s -X POST "https://api.example.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  -c /tmp/cookies.txt -D -

# Use the cookie in subsequent requests
curl -s -X GET "https://api.example.com/endpoint" \
  -b /tmp/cookies.txt
```

---

## Browser Tooling Note (attached mode)

When you `playwright-cli attach` to the user's Chrome (extension or CDP), you may see a "Playwright Extension started debugging this browser" page showing "unknown" connected. This is normal — the connection is established. The browser is in a group, and one of the tabs contains the page the agent navigated to. Do not refresh or relaunch; proceed with the task. Tear down with `detach` (not `close`) so the user's browser stays open.

## playwright-cli gotchas

- **Default to snapshot refs; switch to role+name only when a ref fails.** `snapshot` returns positional refs (e.g. `e18`), and acting on them directly (`click e18`, `fill e18 "..."`) is the normal flow — it works the large majority of the time. Refs are a snapshot of one moment, so they can go stale when the page re-renders (validation, hydration, controlled inputs), causing "ref no longer exists / invalid" failures. **When a ref fails or behaves unstably, re-resolve that one interaction by accessible role and name** — `click "getByRole('button', { name: 'Submit' })"`, `fill "getByRole('textbox', { name: 'Email' })" "..."` — so the locator re-binds against the live DOM. This is also the fallback for custom components: if `select e9 "value"` fails on a Radix/shadcn select that isn't a native `<select>`, open it with a role+name `click` and pick the option by role+name. Don't pre-emptively rewrite everything to role+name — reach for it when refs give you trouble.
- **No new tabs in attached mode.** `tab-new` is not supported when attached to the user's Chrome. Reuse the active tab and `goto` to change page.
- **Two strikes rule.** If the same command fails twice with the same error, stop and report. Do not iterate on permutations.

## Input Handling

Prefer `fill e5 "..."` over typing character by character unless the input doesn't propagate the `fill` as expected. Use `type` or `press` only when `fill` fails to trigger the expected behavior. As a last resort, use `run-code` to execute JavaScript that sets the value directly on the input element.

Re-snapshot between fallbacks. A previous `fill` or `type` attempt may have shifted focus or changed the DOM, invalidating any refs you were about to reuse.
