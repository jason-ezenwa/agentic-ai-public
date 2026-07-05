---
name: grill-me
description: Interview the user relentlessly about a feature or idea until reaching shared understanding, then produce a plan or spec. Use before generating a plan or speccing out a feature when requirements are unclear or not yet defined, or when "grill me" is mentioned.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

When we've reached shared understanding, produce the output:
- **If in plan mode**: generate a plan.
- **Otherwise**: invoke the `/create-technical-spec` skill.
