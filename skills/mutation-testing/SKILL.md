---
name: mutation-testing
description: Measures whether the test suite would actually fail if the code broke, by mutating changed lines and checking which mutants survive. Use when asked to "mutation test", "check if the tests would catch it", or "are these tests any good". Invoke deliberately — never as a side effect of another skill, and never in CI.
---

# Mutation Testing

Answers the question a green suite cannot answer about itself: not *do the tests pass*, but **would they fail if this code broke**. A suite can be green against both correct and broken code. On a payment path, an access check, or a balance calculation, that difference is worth knowing.

> All paths are relative to the skill's base directory provided when you load the skill.

## 1. Preconditions

**Run the baseline suite and confirm it is green.** A red baseline makes every mutant look killed, and the campaign reports a clean bill of health over a broken suite. This is not optional — check it before anything else.

Commit or stash outstanding work, so a stray surviving mutation is obvious in `git status`.

## 2. Isolate the campaign

**Never run two mutation campaigns against the same working tree.** Two agents mutating the same files produce nonsense — one agent's revert wipes the other's mutation mid-run. The dangerous direction is *false kills*: a suite fails because of the other campaign's mutation, and genuinely unprotected code gets certified as protected. You cannot detect this after the fact.

Give every campaign its own worktree, detached at the current HEAD so the diff versus base is identical to your branch's:

```bash
git worktree add --detach ../$(basename "$PWD")-mutation HEAD
```

Copy env files across and install dependencies in it — the suite has to run there:

```bash
find . -maxdepth 3 -name '.env*' -type f -exec cp {} ../$(basename "$PWD")-mutation/{} \;
```

Treat the worktree as a disposable lab. Mutants are applied and reverted there; nothing of value is authored in it. Tear it down at the end with `git worktree remove`.

## 3. Pick the approach — ask the user

Check whether the repo already has a mutation tool (StrykerJS for JS/TS, the equivalent elsewhere). If it does, use it.

If it does not, **ask the user** — do not decide:

1. **Install and configure Stryker** in the repo, so campaigns are repeatable.
2. **Hand-rolled mutation by a sub-agent** — no tooling added.

Option 2 is a real fallback, not a consolation prize. A careful hand-rolled pass finds genuine survivors, including gaps a tool later confirms.

Either way, the scope is the same: **the changed lines of this branch versus the branch you are raising the PR against.** Never whole files, never a hardcoded list. The two paths reach it differently, because they pay for scope differently.

### Stryker

Follow [Stryker setup](references/stryker.md). The config derives the scope itself on every run and aborts if it comes back empty, so you do not compute or pass anything — install it, run it, and read the results.

### Hand-rolled

**Do not hand-roll it yourself — delegate to a sub-agent working in the campaign worktree.** It is a critique of your own work, and the separation is what makes the verdict worth anything. Give it the worktree path and the base branch, and nothing about how to judge. Its brief:

- Scope is the diff against the base branch, excluding test and spec files. Read it directly; nothing to compute.
- Apply one mutation. Run the tests covering it. Record kill or survive. Revert. Repeat.
- Revert every mutation before applying the next — never stack them.
- Verify `git status` is clean before reporting.
- Return the survivor list and the wall-clock. It does not triage and does not fix; that is yours in step 4.

One sub-agent per worktree. If you run several, each gets its own — two agents mutating one tree produce false kills, per step 2.

## 4. Triage every survivor

Judge each by one question: **if this mutation shipped, who would notice?**

| The survivor means | Action |
|---|---|
| A customer or the database would notice — a decision reversed, a boundary moved, a price or a written field changed | **Fix the test** |
| No input can make the line matter — a guard that never fires, a default that never applies, an unreachable branch | **Delete the code** |
| Only we would see it — log wording, log payload shape, internal exception text | **Ignore, with a reason** |
| A fake is more forgiving than the real thing | **Flag, do not fix** |

Two calls that are easy to get backwards:

**Delete, do not test.** Code with no effect is unkillable by construction — removing a guard that never fires changes nothing, so no test can ever detect it. Writing one is wasted effort that also pins dead code in place.

**Pin text a customer reads, not text we read.** A `400` message specified in the spec is worth asserting. An internal exception message is not — asserting log copy makes the suite brittle and buys no safety.

## 5. Fix, then prove each fix

Apply and commit the fixes on the feature branch in your primary tree, then sync the worktree and **re-run the full scope**:

```bash
git -C ../<repo>-mutation reset --hard <feature-branch>
```

Re-run the same scope, not just the fixed files. That gives a real before-and-after against the first report, and it catches a fix that kills its own mutant while breaking another.

## 6. Report

- Mutants generated, killed, survived, and wall-clock — first run and after fixes.
- Every fix, and which mutant it kills.
- **Every ignored survivor, with its reason.** Non-negotiable. Without it, "ignore" becomes a dumping ground nobody can audit.
- Everything flagged as needing an integration test.

## Anti-goals

- **Do not chase the score.** The survivor list is the artifact; the percentage is not a target. A score raised by asserting log wording is a regression.
- **Do not kill mutants at any cost.** A brittle test pinning implementation detail is worse than a surviving mutant.
- **Do not mutate code the change did not touch.** That is what the scope is for.

## Reference

- **Stryker setup and configuration** — [references/stryker.md](references/stryker.md)
