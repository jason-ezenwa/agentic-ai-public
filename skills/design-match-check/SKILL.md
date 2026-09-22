---
name: design-match-check
description: Shows build vs. design side by side, then closes the gaps (if any).
---

You've built this to match the design, Show that it actually does.

Work from your implementation and the design that drove it — Figma, Claude Design, or any other fetchable design source.

## Using a browser

Use an in-app browser tool if one is available. Otherwise, confirm `playwright-cli` exists with `playwright-cli --help` and use it to resize, navigate, and capture screenshots.

## Process

1. **Desktop pass** — for every implemented screen: resize the browser to the design's desktop frame, capture the implementation, fetch the reference screenshot, present both side by side in one artifact, one section per screen.
2. **Desktop feedback** — collect call-outs. Note them; don't fix yet.
3. **Mobile pass** — same as step 1, for every screen that has a distinct mobile design (a desktop screen made responsive without one isn't flagged as missing).
4. **Mobile feedback** — collect call-outs. Note them; don't fix yet.
5. **Fix** — address every call-out from both passes.
6. **Re-verify** — re-present the full scope side by side again: call-outs first (proving the fix landed), then the rest of the scope (proving nothing else regressed).

## Presentation

One artifact per pass, implementation and reference side by side per screen, each section labeled with the screen name and viewport. Reuse cached reference screenshots across passes where the design source supports it — don't re-fetch what hasn't changed.
