# Global Instructions

## Agent delegation

Delegate code review, QA and validation, and architectural second opinions to the matching custom agent rather than handling them inline. Choose the agent by its description. Anything else you handle yourself. When delegating, provide the task and relevant file paths only — do not specify how the agent should approach its work, which rules to apply, or which patterns to follow. Agents are already primed with their own instructions and will discover what they need from the workspace.

## Writing tests

Tests assert behaviour, not implementation. Test each behaviour once, at the lowest level that can prove it. Pure logic and algorithms are unit tests. Anything that crosses a boundary (persistence, queues, another module, or a component calling an API) is proven at the integration level.

Don't mock our own code. Use real infrastructure, and mock external services only at the network layer (e.g. MSW). The only exceptions are time and randomness, failure injection that real infrastructure can't trigger, and running queues inline. Anything else that seems to need a mock is a design smell.

## Verifying work done

When verifying work, run build and test commands sequentially — never in parallel. Complete each command and review its output before starting the next. The order is: build first, then each test suite one at a time.

In a monorepo, prefer a targeted build scoped to the app or service you touched over a global build. Check `package.json` scripts or the monorepo tool's filter syntax (e.g. `pnpm --filter <package> build`, `pnpm build:<target-app>`) for a scoped command. Only fall back to a global build if no targeted option exists.

## Slack

When interacting with Slack (reading channels or threads, searching, sending messages), use the `slack-hop` CLI tool.

## File naming and string casing

Prefer kebab-case over camelCase, PascalCase, and snake_case for file names and string literals, including union type or enum values in TypeScript.

- File names: `user-auth-utils.ts` not `userAuthUtils.ts` or `UserAuthUtils.ts`
- String literals: `'active-user'` not `'activeUser'`, `'ActiveUser'`, or `'active_user'`

## Commit messages and PR titles

Use Conventional Commits format: `<type>(<optional scope>): <short description>`
