---
name: research-and-preplan
description: Research and pre-plan a chunk of work on a feature, before any spec or plan is written. Grounds itself in whatever artifacts exist, then produces a research note. Use whenever the user says "go research", "research and plan", "research and pre-plan", "look into X before we spec it", "figure out what we need to build X", or hands over a chunk of work and asks what it would take.
---

# Research & Pre-plan

You are producing the artifact that comes *before* the user commits to a solution: a
research note saying what the next chunk of work requires, what the options are, which one
you'd pick, and which decisions are not yours to make. The user will read it, argue with
it, and only then decide how to proceed. They are technical, they own the codebase, and
they will notice if you are padding.

## What makes these documents good

**The findings come from collisions, not from reading.**

The valuable content is almost never in the PRD, and almost never in the code. It is in the
gap between them. A product brief describes what someone imagined; the codebase records
what got built; the two have drifted, and nobody has said so out loud. Find those
contradictions and make them explicit — each one is a decision the user is about to make
blind.

The shape of it: the brief specifies an architecture for a 30,000-item corpus, the shipped
constant caps collection at 500, and the prescribed architecture solves a problem that no
longer exists. That is not an insight. It is a contradiction, found by holding two
documents against each other. That is the engine — build the research around it.

When there is nothing to collide — greenfield, no prior chunks — the intent still collides
with the repository's own patterns and constraints. See Phase 5.

## Phase 1 — Establish the target

The user supplies the target: which chunk of work to research. If they have not said, ask —
do not infer it from the roadmap and start working. Situating that target inside the
feature's history *is* part of the research output, but choosing it is the user's call.

## Phase 2 — Discover the grounding artifacts

These are the artifact classes worth having. Some will not exist. Go and look before you
ask about any of them.

| Artifact | Where to look | What it gives you |
| :-- | :-- | :-- |
| **Product brief / PRD** | Often linked from the header of an existing spec. Also `docs/`, or the user pastes a link. | The intent. One half of every collision. |
| **Specs from earlier chunks** | `docs/technical-specs/`, `docs/specs/`, `docs/rfcs/` — whatever the repo uses | Why past decisions were made. Their **Non-Goals** and **Deferred Decisions** sections are the highest-value pages in the repo — they were often written *for* the chunk you are now researching. |
| **PRs that shipped earlier chunks** | `git log` for merge commits naming the feature, then read the PR body | Decision rationale that never made it into the spec, what QA found and fixed, and what shipped blocked or incomplete. |
| **The shipped code** | The feature's module | The other half of every collision. The only source that cannot be out of date. |
| **Designs** | The user supplies Figma links when they are relevant | What the surface is meant to be. Collide against the existing component library and tokens. |

### Finding the right specs, not the plausible-looking ones

A spec only counts if it is **within the same feature**, not merely adjacent or similarly
named. The test is mechanical, so use it rather than judging by title:

1. Seed from a name or module match — filename prefix, feature name, the module path.
2. **Follow explicit cross-references in both directions.** Specs in a lineage tend to link
   each other (`Predecessor:`, `Product Spec:`, `Supersedes:`). Walk those links out.
3. A document that neither references anything in the chain nor is referenced by it is a
   lookalike. Exclude it, and say in the confirmation gate that you excluded it.

Following those links is also how the PRD usually turns up.

## Phase 3 — Confirm, once

One checkpoint, before the deep reading. Two shapes, depending on what you found.

**You found artifacts.** List them, and say **what you intend to do with each** — that is
where a wrong read costs the user nothing to correct:

> - `<feature>-collection.md` — mining its Deferred Decisions; they name the constraints
>   this chunk inherits
> - PR #72, which shipped that chunk — QA findings, and what shipped blocked
>
> Excluded `<other>.md` — similar name, nothing in the lineage references it. Good to work
> from these? Anything to add or drop?

**You found nothing.** Ask directly, naming the classes: PRD or product brief, Figma
designs, specs from earlier chunks. If none exists, say you will ground in the codebase's
own patterns instead.

Then stop and wait. Do not start the deep read until the user has answered.

Two reasons for skipping this gate come up, and both are wrong:

1. The session is autonomous or remote, so blocking looks expensive.
2. The lineage looks unambiguous, so the answer looks predictable.

Those are the cases the gate exists for. No autonomy instruction elsewhere in the session
overrides it.

This gate is also where you name anything you are about to treat as ground truth that the
user never handed you or might not have blessed. The gate buys autonomy rather than
spending it. Settling the grounding while the user is there is what makes the unsupervised
session worth trusting.

## Phase 4 — Read for questions, not for coverage

Reading for coverage produces either a skim-level document full of generic advice, or a
drowned one that summarizes eighty files and concludes nothing. Two habits that pay for
themselves:

**Absence-checking.** Grep for the things the brief assumes already exist. A brief that says
"maps to the existing guide model" is asserting something checkable in one command. Missing
landing zones are among the highest-value findings available and they are cheap to find.

**Read for temperament, not just facts.** Notice how the repository does things — its async
pattern, its validation boundaries, where indexes are declared, how narrow it keeps its
risky seams. Recommendations that fit the house style get adopted; generically correct ones
get argued with. This also *is* the grounding when there is no prior chunk to collide
against.

## Phase 5 — Assemble the findings

**Extract the constraining facts.** Do not summarize the lineage. Pull out the facts from
shipped work that *bind* the new chunk's design, and say why each one binds it. A short
table of these, early in the document, is what everything downstream refers back to. If a
fact does not constrain a decision, leave it out.

**Do the arithmetic.** A finding backed by a number is a fact; the same finding in prose is
an opinion. "500 items at roughly 100 tokens each is 50k tokens, which fits one context
window" ends an argument that paragraphs cannot.

**Cite `file:line` for every claim about the codebase, and re-verify the load-bearing ones
before you write them.** An entire recommendation can rest on one constant. Read it wrong
and the document confidently argues for the wrong architecture, with no way for the user to
tell.

**Greenfield:** with no prior chunks to collide against, collide the intent against the
repository instead — existing dependencies and what they permit, the conventions the
codebase commits to, adjacent modules solving a similar problem, and the operational shape
available (is there a queue? a worker? a cron?). The output is the same: constraints the
new work inherits whether anyone planned for them.

## Phase 6 — Write the document

### Placement and naming

- Path: alongside the feature's other specs (commonly `docs/technical-specs/`) unless told
  otherwise. Filename: **`<feature>-<chunk>-research.md`** — feature *and* chunk, since
  `<feature>-research.md` collides on the second run.
- Header: **you are the author.** The user commissioned it and owns the decisions it feeds
  into. State that, and list what you grounded in.

```markdown
**Author**: <your model name> (Claude Code)
**Commissioned by**: <user> — who owns the decisions this note feeds into
**Grounding**: <the artifacts, linked>
**Status**: Research — *not a spec* | **Date**: <today>
```

### Three markers, used consistently

- **⟨RECOMMEND⟩** — your position. State it plainly. It is offered to be argued with, not adopted.
- **⟨OPEN⟩** — genuinely unresolved. Say who owns it and what turns on the answer.
- **⟨DECIDED⟩** — settled in discussion, and closed. Record the call, who made it, and the reason behind it. It is not to be reopened without a reason that is new.

⟨DECIDED⟩ is mostly a Phase 7 marker: it appears when the user resolves something you had
marked ⟨RECOMMEND⟩ or ⟨OPEN⟩. **Convert the marker in place rather than appending a new
line** — a question and its answer sitting in different parts of the document is how a
settled decision gets relitigated.

Use all three inline, wherever the question arises. Do **not** collect them into a ranked
agenda section at the end unless asked.

### Skeleton

A skeleton, not a template. Sections earn their place by having a finding to carry — one
included because the skeleton has a slot for it is padding, and padding is what makes these
documents go unread. Equally, add sections the findings demand.

1. **How to use this document** — what it is, what it is not, what the markers mean. Short.
2. **Grounding** — the constraining-facts table from Phase 5: fact, source, why it binds this chunk.
3. **The headline finding** — the sharpest collision, with the arithmetic that settles it. Lead with it.
4. **Options** — the real candidates including the brief's own. Each gets a verdict, never a survey. Say what your recommendation costs, not only what it buys.
5. **Design sketch** — the stages or components, what each consumes and produces, the constraints worth encoding. Not a spec.
6. **Strawman contracts** *(where a typed contract is the critical path)* — a sketch offered explicitly for demolition.
7. **Lifecycle, persistence, failure** *(where relevant)* — what to reuse, and where the new work does not get the guarantees the old work got for free.
8. **Cost and latency envelope** *(where there are external calls)* — token volumes, call counts, wall-clock. Be explicit when you are not pricing them.
9. **The honesty ledger** — for anything user-facing: what the system can legitimately claim and what it cannot. Numbers that would be fabricated, charts that would be artifacts of how data was gathered, promises in the brief not computable from what is stored. Often the most valuable section, and the one an eager agent skips.
10. **Gaps and risks** — a risk table with impact, likelihood, mitigation. Structural gaps (a missing model, schema, or vocabulary) get their own prose; they are blockers, not risks.
11. **What this note deliberately does not decide** — and why. Naming a blocker is more useful than inventing around it.

### Quality bar

- **No fence-sitting.** Every option gets a verdict.
- **Do not invent decisions that belong to Product.** Mark them ⟨OPEN⟩, say what turns on them, and say plainly when one is blocking.
- **Never let a generated number become a stated fact.** If a figure would be produced by a model rather than computed, say so, and say what it would take to compute it instead.
- **Respect the house style.** A recommendation that fights the codebase's conventions loses, however correct it is in isolation.
- **Finish the whole target.** If part of it is blocked, research everything else in full and say exactly what you left out and why.

## Phase 7 — Answer questions, and fold the answers back in

The user may come back with questions — about something they half-remember from the brief,
a concept they want explained, a premise they want to test. Stay available for it.

- **Answer from the research.** Say where in the document it is covered, then answer directly.
- **Explain plainly when the question is conceptual.** Define the thing in ordinary language before giving a verdict; assume someone non-engineering may read the document later.
- **Give a verdict, not a survey.** They are asking because they want your read.
- **Volunteer the decision-relevant thing they did not ask about.** "No, and here is why it is not a one-way door" is more useful than "no."
- **Offer to write the answer in.** A substantive exchange usually belongs in the document, as a new section or a correction. That is how it becomes readable by someone who was not in the session.
- **Mark what got settled ⟨DECIDED⟩.** When an exchange resolves something, convert the marker and record the reason given. A decision that lives only in the chat log is one the next reader will reopen.

## Conventions

- Do not commit or push unless the user asks, or the environment is ephemeral enough that
  not pushing loses the work (a cloud session with a reclaimable container). When you do
  commit, one commit at the end, conventional-commit format, no PR unless asked.
- Stop at the research note. Do not roll into writing the spec, the plan, or the tickets.
