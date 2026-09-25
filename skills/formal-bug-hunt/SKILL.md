---
name: formal-bug-hunt
description: Finds bugs in stateful or concurrent code by modelling it in Lean or TLA+, checking rules against the model, and reproducing every counterexample as a failing test on the real code. Use when asked to "formally verify", "model check", or "hunt for race conditions" in a flow.
---

The model and proofs are tools. The deliverable is failing tests and fixes on the real code.

## 1. Scope

Ask what the context doesn't answer: which flow (payments, a lifecycle, a retry loop, a protocol), and where the model files should live. Pick Lean for proving rules about states and transitions, TLA+ for exploring interleavings and concurrency. Use both if both matter.

## 2. Model

Model only the logic of the chosen flow: states, events, transitions. No I/O or framework. Cite the real code each transition comes from.

## 3. Rules (sign-off gate)

Propose the rules to check and show them to the user before proving anything. For each rule, say:
- Whether it's the strongest version (a stronger rule's passing guarantees a weaker one's).
- Whether it's about behaviour over time: leads-to, and also "happens again and again forever" and "eventually settles and stays", not just "never bad".
- How many steps it would take to break. Rules that break in 1-2 steps are the kind normal tests already catch; aim for rules that need 3 or more.

## 4. Check

Prove or model-check each rule. No `sorry`, no new axioms. Report each rule as proved, violated (with the counterexample), or unfinished.

## 5. Reproduce and fix

Turn every counterexample into a test on the real code that fails first. A counterexample that doesn't reproduce means the model is wrong: fix the model, not the code. Then fix the code so the test passes, one PR per bug.

## Gotchas

- Nothing mechanically ties the proofs to the code. Treat them as provisional until counterexamples reproduce, and re-check after the code changes.
- If the model disagrees with real runs, say so and don't claim anything is proven.
