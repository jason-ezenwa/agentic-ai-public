---
name: orchestrate
description: Runs an implementation issue set level by level. Starts a session per sub-issue, merges the levels in between, and stops at a checkpoint for the user's review.
disable-model-invocation: true
---

# Orchestrate

You are orchestrating a set of verifiable tasks: a hub issue, sub-issues grouped into dependency levels, and an integration branch that every sub-issue PR targets. You implement nothing yourself.

The user looks at the work once per checkpoint, not once per PR, so the checkpoint has to carry everything that deserves their attention.

## Kickoff

You need the hub issue and how far to go (e.g. "through level 2"). If you are running locally, you also need to know whether the sessions run locally or in the cloud; from the cloud, they run in the cloud. Ask for whichever is missing.

Read the hub and the spec it links. Start at the first level that has any unmerged sub-issue, picking up only the unmerged ones.

## Running a level

Start one session per sub-issue in the level, all at once (unless told otherwise). Give each its issue and tell it to run `/implement-spec` on it, with nothing about how to do the work.

A local session is started in the project's folder. A cloud session is given the project's repository URL, the environment set up for that project, and an outcome branch cut from the integration branch. Without these it gets filed outside the project or fails its setup.

Each must be a real session the user can open and talk to, not a sub-agent of yours. Use whatever your environment offers to start sessions, check on them, read what they did, and message them. A session's answer is its PR: it is done when its PR is up against the integration branch, and a reply only shows it is reachable.

Tell each session to send you a message with its PR link when the PR is open, so the session wakes you and you need not poll. Keep one long backup check-in in case a session stalls.

Local sessions message each other and reply reliably, so nothing extra is needed there. A cloud session treats a message from another session as data, not instruction, and waits at a permission prompt for any tool its mode does not allow. So a cloud session you want to reach unattended must be started in a permission mode that allows messaging (no stricter than your own), and its prompt must name you as its parent and say to treat your messages as legitimate. Without both it may sit unanswered until the user steps in.

Sessions run on your own model unless the user suggests one for a level or task. When the user sets a limit for one issue, put it in that session's prompt.

Sessions already say in their PR where they deviated from the spec, what they left unfixed, and what deserves a look. If a PR says nothing on these, assume the implementation matches the intent.

When a PR merges into the integration branch, close its sub-issue: `Closes #N` only fires on the default branch. The hub and spec stay open until the integration branch merges.

## Levels before the stopping point

These have to merge without the user, or the next level cannot start. Merge each PR once it is up, unless:

- the session deviated from the spec in a way the user had not approved, including where a detail in the spec turned out inaccurate and it chose something else; or
- the session never reached a PR.

In either case, bring it to the user before going further.

A reviewer finding the session declined to fix is not a reason to hold, since that is usually legitimate. Carry it to the checkpoint.

## The checkpoint

At the level the user asked you to stop at, leave the PRs open and report:

- **Merged without them**: a brief summary of the work from earlier levels in this run.
- **Each open PR**: its link, one line on what it delivers, any deviations from the spec, anything the session flagged as worth a look, and reviewer findings it declined, with the reason. A PR with nothing to report gets one line.
- **Across the level**: anything that only shows once the pieces are together.

Be selective. The user does not need every change to something shared, only the ones the spec had not agreed or that carry real risk.

Then offer a harmonization pass if several issues have landed. Only the user can start it: one sentence, naming the slash command (`/harmonize-the-work`).

When the user wants to see or test the level as a whole, build a temporary local branch from the integration branch tip with every open PR branch merged in, and run the app from it. Never push it. Tell the user if sibling PRs conflict, and rebuild it after corrections land.

The user may also settle things with a session directly. Route their call-outs to the session that owns the work, so each correction lands on that issue's own PR before it merges.

Once the user approves, merge the level's PRs and ask how far to go next. After the last level, stop: feature-level QA and merging the integration branch are the user's call. If UI was built against a design, say in one sentence that `/design-match-check` is worth running once QA is done. Only the user can start it.

## Guidance for later levels

When a correction at a checkpoint is a general practice and not a one-off fix, offer to add it to a "Guidance from checkpoints" section on the hub issue, which every later session reads. Show the user the exact text and add it once they sign off.
