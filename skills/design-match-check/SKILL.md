---
name: design-match-check
description: Shows build vs. design side by side, then works with the user to close the gaps (if any).
disable-model-invocation: true
---

You've built this to match the design, Show that it actually does.

Work from your implementation and the design that drove it — Figma, Claude Design, or any other fetchable design source.

## Using a browser

Use an in-app browser tool if one is available. Otherwise, confirm `playwright-cli` exists with `playwright-cli --help` and use it to resize, navigate, and capture screenshots.

## Process

1. **Desktop pass** — for every implemented screen: resize the browser to the design's desktop frame, capture the implementation, fetch the reference screenshot, present both side by side in chat.
2. **Desktop feedback** — collect call-outs from the user. Note them; don't fix yet.
3. **Mobile pass** — only once desktop feedback has been collected from the user and noted. Same as step 1, for every screen that has a distinct mobile design (a desktop screen made responsive without one isn't flagged as missing).
4. **Mobile feedback** — collect call-outs from the user. Note them; don't fix yet.
5. **Fix** — address every call-out from both passes.
6. **Re-verify** — re-present the full scope side by side again: call-outs first (proving the fix landed), then the rest of the scope (proving nothing else regressed).

## Presentation

Send everything in chat, not as an artifact: artifacts pile up and are hard to clean up. Show implementation and reference as two separate images, sent next to each other per screen, not stitched into one composite. Group them into sensible chunks (by flow or page), each labeled with the screen name and viewport. Keep the images crisp: capture PNGs and never show them upscaled past their native size. Reuse cached reference screenshots across passes where the design source supports it — don't re-fetch what hasn't changed.
