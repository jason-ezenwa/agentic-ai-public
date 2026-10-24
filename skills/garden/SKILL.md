---
name: garden
description: Tidies code without changing what it does.
---

# Gardening

Work gets done and it works, but it often looks messy. Gardening makes it look pristine, easy to read and easy to navigate. It changes how the code is laid out, never what it does. The app compiles and every unit and integration test passes, before and after, and nothing changes beyond the cleanups below.

## Scope

- **After an implementation**: only the code the branch added or changed. Folders are created only for files the branch added. Commits go on the implementation's branch and PR.
- **Existing work**: the modules, features or parts of a client the user points at. A feature can span server and client. The work goes on a new branch and a new PR.

## The cleanups

**Spacing**
- A multi-line declaration or statement gets a blank line above and below it.
- Two or three short single-line declarations that belong together can sit together. A longer run reads as a wall, so break it into related groups.

**Types and constants**
- They live in the types and constants files of their feature or sub-feature, never in services, controllers, utils, components or pages. That holds even when only one file uses them.
- Name them `<feature>.types.ts` and `<feature>.constants.ts`, unless the app already names them differently.

**Core and sub-features**
- The core of a module or feature (its module file, main controller, service or component, and their types and constants) stays at the top level, as do `dtos/` and `schemas/`.
- Each clear sub-feature moves into its own folder, together with its tests, types and constants.
- Group by sub-feature, not by kind of file.
- A sub-feature can be split into folders once more, but no further: `<feature>/<sub-feature>/<sub-sub-feature>/` is fine, a folder below that is not.

**Pages (React apps other than Next.js)**
- `pages/` holds pages only. Components go to `features/<feature>/components/`, hooks to `features/<feature>/hooks/`, types and constants to `features/<feature>/`, and page tests to `features/<feature>/tests/`.

## Off limits

Renaming symbols, changing logic, rewording comments, deleting dead code, touching dependencies, fixing lint, and changing a package's public export paths. Anything worth doing that falls under these goes in the PR under **Noticed, didn't touch**.

## Passes

Run three passes in order, with one commit each:

1. Spacing: `style(<scope>): …`
2. Types and constants: `refactor(<scope>): …`
3. Folders and pages: `refactor(<scope>): …`

Types go before folders so new types files move with their sub-feature. A move updates every reference to the file: imports, `jest.mock` paths and config globs.

Do a small scope yourself. For a larger one, use 2–3 sub-agents on targets that share no directories, and keep the same sub-agents for every pass: continue them, don't spawn new ones. In pass 3, give each sub-agent a whole app, because moves rewrite imports across it. Sub-agents only edit files; you own git.

After each pass, run the build, then each test suite one at a time. Then run the pass's check and fix anything it catches before committing:

- Spacing: `git diff -w --ignore-blank-lines` is empty.
- Types and constants: every removed line reappears unchanged in its new file, and only imports and exports differ.
- Folders and pages: `git diff -M` shows renames, plus changes to imports.

A failure means the pass changed behaviour: fix the pass, never the test.

## Review

Once all three passes are in, give the commits to two sub-agents in parallel. One checks that behaviour is unchanged; the other checks the result against these rules. Fix what they raise and send each fix back to the reviewer who raised it, once. If it still doesn't pass, bring it to the user.

## PR

Push the branch. For gardening on existing work, open a PR that gives a short summary of what moved where, plus **Noticed, didn't touch**.
