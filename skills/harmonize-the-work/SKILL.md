---
name: harmonize-the-work
description: Harmonize and clean up work done across multiple implementing agents/sessions after a milestone or significant chunk of a spec has been delivered. Use when the user says "harmonize the work", "harmonize the branch", or wants a cleanup pass across chunks of related work.
---

# Harmonizing the Work

Different implementing agents pick up tasks split from a spec. Blockers get merged before the next set of work goes on, and then it builds on top of that work. With different sessions, there might be some points where things are a little disjointed, or something is left out from the initial spec compared to where we are currently. This is the harmonization pass — cleanup so that the software is quality.

## Inputs

- The **spec** the work was split from, or the spec and the issue-set breakdown.
- The **branch or set of merged changes** that make up the milestone work so far.
- Which tasks are **done vs. remaining** — remaining tasks define what's out of scope for "left out".

## What to look for

This is **not** an adversarial look against all the work. The sessions have already been through the regular flow: implementation, correctness and quality reviews by sub-agents, independent verification, integration tests. Assume the work is right unless you stumble on evidence otherwise. You are looking for opportunities for **simplification, harmonization, and cleanups**:

1. **Disjointedness** — points where work from different sessions doesn't quite fit together: inconsistent patterns for the same kind of thing, naming drift, parallel conventions that should be one.
2. **Left out** — something that should have been handled by now, is not supposed to be handled by the remaining tasks, but hasn't been delivered yet. Compare the spec against where we are currently.
3. **Repetition** — things that are repeated and would be better if abstracted and then reused, reducing the amount of code in the branch.
4. **Incidental defects** — if there are things that haven't been done right, note them too, but this is a byproduct, not the mission.

## Process

1. Read the spec (and the issue-set breakdown if provided); establish what "done so far" should cover and what the remaining tasks will cover.
2. Sweep the milestone changes (use Explore/review sub-agents in parallel across areas if the surface is large) with the four lenses above.
3. Point out the findings to the user. Do not fix anything.
4. Triage with the user. They decide how to go about them.

## Output of the spotting phase

A numbered findings list the user can triage item-by-item — each item self-contained, no "see above". Group by lens, order by impact within each group.
