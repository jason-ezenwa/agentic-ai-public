---
name: motion-video
description: Makes a short motion-graphic video toward a goal (ad, launch, feature promo): brief, still frames for sign-off, one hero render for sign-off, then the outputs the goal needs. Use when asked to "make a video", "make an ad", or "animate this".
---

Every video serves a goal. Get to stills the user approves before any motion, and one approved hero before any variants.

## 1. Brief

Ask only what the context doesn't already answer:
- **Goal:** what should a viewer do after watching? Where does the source context live (meeting, doc, ticket)?
- **Audience and placements:** who, where, which platforms.
- **Visual reference:** Figma, a website, a screenshot, or inspiration. If the product has a site, screenshot it and extract its palette, type and components. Use only those.
- **Content rules:** claims that must match the product, required disclaimers, copy conventions.
- **Outputs:** formats, lengths, and any variants (dates, languages, audiences). Often just one.

## 2. Stills

Script the scenes, then show one still per scene, for every format, side by side. Iterate here until signed off: colour, type, layout and copy accuracy. No animation yet.

## 3. Hero

Animate the approved stills and render one version. Add sound only if the placement is watched with sound; it must be original or licensed. Hand it over for review on a phone.

## 4. Outputs

After hero sign-off, render the rest and verify each file (duration, size, colour) before handing them over.

## Build notes

- Author frames as HTML with a `seek(t)` that places every element at time t, so every frame is deterministic and stills and video come from the same source.
- Capture frames losslessly (PNG). Encode H.264 with a BT.709 colour matrix and tags, or brand colours shift on phones.
- Only use fonts and music licensed for commercial use. Trial or personal-use fonts don't go in paid media.
- Keep the source in the repo, and the rendered videos out of git.

## Gotchas

If the user complains about things like these:
- **Colours look dull, washed out or off on the video, but the stills look right:** suspect encoding before design. Check the file's colour tags and sample a brand colour from the decoded video against its hex. Only change the design if the encode checks out.
- **Text or edges look soft or blocky:** check the frames were captured losslessly and the bitrate/CRF isn't starving flat graphics.
- **Quality drops when shared in Slack or similar:** the preview re-compresses. Judge from the downloaded file.
