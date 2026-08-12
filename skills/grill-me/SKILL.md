---
name: grill-me
description: Interview the user relentlessly about a feature or idea until reaching shared understanding, then produce a plan or spec. Use before generating a plan or speccing out a feature when requirements are unclear or not yet defined, or when "grill me" is mentioned.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Work down the design tree, resolving dependencies between decisions as you go. For each question, provide your recommended answer.

Ask in rounds of no more than three questions. Three is a ceiling, not a quota — ask fewer when fewer qualify.

A question belongs in the current round only if it is answerable now and independent of the others in the round. Leave out anything whose answer depends on another question in the round, or on something that only becomes clear once the round is answered. Those wait for a later round.

Each round reshapes the tree. Derive the next round from the new shape rather than from a list drawn up earlier.

If a question can be answered by exploring the codebase, answer it yourself instead of asking me. Delegate the lookup to a sub-agent and keep grilling while it works — the interview should never be blocked waiting on a fact. Fold the answer in when it lands, and let it reshape the next round if it changes anything.

Keep this cheap: delegate only what genuinely needs exploring, and keep no more than a couple of lookups in flight. Anything a single grep would settle, settle yourself.

Keep a running decision log in a scratchpad: append each decision, its rationale, and the rejected alternatives the moment it is settled. Do this periodically, in chunks as we grill — not at the end. This also covers cases where I explicitly ask you to bake in specific nuances, thought trails, or decisions.

When we've reached shared understanding, produce the output:
- **If in plan mode**: generate a plan.
- **Otherwise**: invoke the `/create-technical-spec` skill.

Write the output from the decision log rather than from conversation context, so it doesn't miss important details. Then check the finished document back against the log, decision by decision, before presenting it.
