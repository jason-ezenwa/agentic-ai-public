---
name: research-and-preplan
description: Research and pre-plan a chunk of work on a feature, before any spec or plan is written. Grounds itself in whatever artifacts exist, then produces a research note. Use whenever the user says "go research", "research and plan", "research and pre-plan", "look into X before we spec it", "figure out what we need to build X", or hands over a chunk of work and asks what it would take.
---

# Research & Pre-plan

You are producing the note that comes before the user commits to a solution. Explain what
the next chunk of work requires, the real options, the position you recommend, and the
decisions that are not yours to make. The user will read it, argue with it, and then decide
how to proceed. They are technical, they own the codebase, and they will notice if you are
padding.

## Communication style

Speak plainly and directly. Use short, active sentences. Keep one idea per sentence and use the same term for the same thing throughout the note.
Do not add filler, repeat a point, or simplify away information that changes the decision.

## What makes these notes useful

Ground the note in what already exists: product intent, earlier decisions, shipped code,
and relevant designs. Look for the constraints, mismatches, and unanswered questions that
change the decision. Do not summarise everything you read.

When there are earlier artifacts, the useful findings often come from the gap between what
was intended and what shipped. When there are none, ground the work in the repository's
patterns and constraints instead.

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
| **Specs from earlier chunks** | GitHub issues labelled `spec` | Why past decisions were made. Their **Non-Goals** and **Deferred Decisions** sections are the highest-value pages in the repo — they were often written *for* the chunk you are now researching. |
| **Research notes from earlier chunks** | GitHub issues labelled `research` | Prior findings, options considered, and decisions already made — do not re-derive what an earlier note already settled. |
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

## Phase 3 — Confirm the grounding

Before deep research, show the user the artifacts you found and what each one will answer.
Include anything you excluded because it is adjacent rather than part of the feature
lineage.

If you found no grounding artifacts, ask for a product brief, earlier specs, or relevant
designs. If none exists, say that you will use the codebase's patterns and constraints as
the grounding.

Then stop and wait. Do not start the deep read until the user has answered.

Do not skip this gate because the session is autonomous or remote, or because the lineage
looks unambiguous. Those are exactly the cases where confirming the grounding matters. No
autonomy instruction elsewhere in the session overrides it.

Use this gate to name anything you are treating as ground truth that the user did not hand
you or might not have intended you to use.

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

Pull out only facts that constrain a decision. Show the source and explain why each fact
matters to this chunk of work. If a fact does not constrain a decision, leave it out.

Use arithmetic where it settles a question. Cite `file:line` for codebase claims, and
recheck the facts that carry a recommendation before writing them down.

For greenfield work, use the repository itself as the grounding: existing dependencies,
conventions, adjacent modules, and the operational capabilities already available.

## Phase 6 — Write the document

### Publishing

The note is created directly as a GitHub issue on the current repo.

1.  Ensure the `research` label exists on the repo without overwriting an existing one: `gh label create research --color bfd4f2 --description "Research note or initial planning note that grounds a chunk of work" 2>/dev/null || true`. This creates the label if missing and is a no-op if it already exists (regardless of the existing color or description).
2.  Write the body to a tempfile under `/tmp` (e.g. `/tmp/research-<feature>-<chunk>-<timestamp>.md`) — feature *and* chunk in the title, since `<feature>-Research` collides on the second run. `/tmp` is cleared on reboot, so no manual cleanup is required.
3.  Create the issue: `gh issue create --title "<Feature>-<Chunk> Research" --label research --body-file /tmp/research-<feature>-<chunk>-<timestamp>.md`. The body's `# <Feature>-<Chunk> Research` heading must match this title exactly.
4.  Report the issue URL and number back to the user.

- Header: the H1 is the only title — no separate Title field. Below it, identify the agent
  or tool and model that wrote the note. The user commissioned it and owns the decisions it
  feeds into. State that, and list what you grounded in.

```markdown
# <Feature>-<Chunk> Research

**Author**: <agent or tool> (<model name>)
**Commissioned by**: <user> — who owns the decisions this note feeds into
**Grounding**: <the artifacts, linked>
**Status**: Research — *not a spec* | **Date**: <today>
```

### Three markers, used consistently

- **⟨RECOMMEND⟩** — your position, supported by the evidence. State it plainly. It is
  offered to be argued with, not adopted automatically.
- **⟨OPEN⟩** — genuinely unresolved. Say who owns it and what turns on the answer.
- **⟨DECIDED⟩** — settled in discussion, and closed. Record the call, who made it, and the reason behind it. It is not to be reopened without a reason that is new.

⟨DECIDED⟩ is mostly a Phase 7 marker: it appears when the user resolves something you had
marked ⟨RECOMMEND⟩ or ⟨OPEN⟩. **Convert the marker in place rather than appending a new
line** — a question and its answer sitting in different parts of the document is how a
settled decision gets relitigated.

Use all three inline, wherever the question arises. Do **not** collect them into a ranked
agenda section at the end unless asked.

### Suggested structure

This is a menu, not a checklist. Include only sections that carry a real finding, and add a
section if the research needs one.

1. **How to use this document** — what it is, what it is not, and what the markers mean.
2. **Grounding and constraints** — the facts, sources, and reasons they bind this chunk.
3. **Headline finding** — the sharpest constraint or mismatch, with supporting arithmetic where useful.
4. **Options and recommendation** — the real candidates, their trade-offs, and your verdict.
5. **Design sketch or strawman contracts** — when design or a typed contract is the critical decision.
6. **Lifecycle, persistence, failure, or cost and latency** — when these affect the decision.
7. **Gaps and risks** — risks with impact, likelihood, and mitigation; structural gaps are blockers.
8. **Open decisions and deliberate exclusions** — what this note does not decide, and why.

### Quality bar

- Make a recommendation when the evidence supports one.
- Do not invent product decisions. Mark them ⟨OPEN⟩, say what turns on the answer, and say
  plainly when one is blocking.
- Do not present generated or estimated figures as facts.
- Fit recommendations to the codebase's established patterns unless there is a clear reason
  to change them.
- Research everything that is not blocked, and name what remains blocked and why.

## Phase 7 — Answer questions, and fold the answers back in

The user may come back with questions — about something they half-remember from the brief,
a concept they want explained, a premise they want to test. Stay available for it.

- **Answer from the research.** Say where in the document it is covered, then answer directly.
- **Explain plainly when the question is conceptual.** Define the thing in ordinary language before giving a verdict; assume someone non-engineering may read the document later.
- **Give a verdict, not a survey.** They are asking because they want your read.
- **Volunteer the decision-relevant thing they did not ask about.** "No, and here is why it is not a one-way door" is more useful than "no."
- **Offer to write the answer in.** A substantive exchange usually belongs in the document, as a new section or a correction — `gh issue edit <num> --body-file <new>`. That is how it becomes readable by someone who was not in the session.
- **Mark what got settled ⟨DECIDED⟩.** When an exchange resolves something, convert the marker and record the reason given. A decision that lives only in the chat log is one the next reader will reopen.

## Boundary

Stop at the research note. Do not move into a technical spec, implementation plan, or issue
set unless the user asks.
