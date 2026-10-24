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
- **Voiceover:** narration is opt-in. Ask whether they want it.
- **Where the source lives:** where the project files (frames, renderer, audio) should be kept so the video can be re-rendered later.

Then find the story: one thread someone could retell after one watch, with a before, a turn and an after. Open on an image that works muted in the first 1–3s, and end on one that echoes it.
- For a product: the pain → the product arrives → it fixes that one thing → the payoff. Tell the user before researching customer pain, and where you'll look.
- For something fun: setup → escalation → twist.

## 2. Stills

Script the scenes from the story, then show one still per scene, for every format, side by side. Iterate here until signed off: colour, type, layout and copy accuracy. No animation yet.

## Narration (only if opted in)

- One narrator, recorded as one continuous take per section. Never generate line by line and stitch.
- Direct the reading, for example "warm, not salesy".
- The voice sets the clock: time the picture to the recording, and hold after a line rather than stretching the gaps.
- Cut takes only in real pauses, never mid-word or mid-sentence.
- Build captions from the audio's word timings, not the script.
- Duck the music about 5 dB under speech.

## 3. Hero

Animate the approved stills and render one version. Any line the viewer is meant to read stays fully on screen for about 0.3s per word, counted from when it has settled.

- One idea per shot: pause on any frame and its focus is obvious within a second.
- Name a transition for every cut (match cut, then push-through, morph, fade) and check the frames on both sides of it.
- Give the 2 or 3 big moments a setup, a hit, one sound and about a second of stillness. Hold 0.4–0.8s after other key beats.
- Default eases: out for entrances, in-out for moves, a short in for exits.

Add sound only if the placement is watched with sound; it must be original or licensed. Write the music and sound effects as one continuous piece: same key and tempo throughout, and no section that restarts at a cut. Keep effects few, soft and pitched to the key. Let the music sit lower under the setup, and land big moments on real beats. If scenes are reordered, re-score for the new order rather than shifting the old cues.

Hand it over for review on a phone.

## 4. Outputs

After hero sign-off, render the rest and verify each file (duration, size, colour) before handing them over.

Save each video's strongest settled frame (text fully in, not mid-transition) as a separate cover image, to upload as its thumbnail.

## Build notes

- Author frames as HTML with a `seek(t)` that places every element at time t, so every frame is deterministic and stills and video come from the same source.
- Capture frames losslessly (PNG). Encode H.264 with a BT.709 colour matrix and tags, or brand colours shift on phones.
- Only use fonts and music licensed for commercial use. Trial or personal-use fonts don't go in paid media.

## Gotchas

If the user complains about things like these:
- **Colours look dull, washed out or off on the video, but the stills look right:** suspect encoding before design. Check the file's colour tags and sample a brand colour from the decoded video against its hex. Only change the design if the encode checks out.
- **Text or edges look soft or blocky:** check the frames were captured losslessly and the bitrate/CRF isn't starving flat graphics.
- **Quality drops when shared in Slack or similar:** the preview re-compresses. Judge from the downloaded file.
