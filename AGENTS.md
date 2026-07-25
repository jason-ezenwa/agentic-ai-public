# Global Instructions

## Communication style

Keep responses short and direct. Lead with the answer or result, skipping preamble and filler. Avoid over-explaining and re-explaining, but never at the expense of important information.

## Agent delegation

- **Code reviews** → use `Ada - Reviewer` for feature correctness and `Jeffery - Reviewer` for code quality
- **Quality assurance and validation** → use `Preye - QA Engineer` for UI validation and `Eren - QA Engineer` for test plan execution
- **Feature design, architecture, or technical planning** → use the `Ezenwa - Senior Tech Lead` agent
- **Process auditing / step verification** → use the `Nnedi - Babysitter` agent

Always spawn the appropriate subagent rather than handling inline. When delegating, provide the task and relevant file paths only — do not specify how the agent should approach its work, which rules to apply, or which patterns to follow. Agents are already primed with their own instructions and will discover what they need from the workspace.

## Validating work done

When verifying work, run build and test commands sequentially — never in parallel. Complete each command and review its output before starting the next. The order is: build first, then each test suite one at a time.

In a monorepo, prefer a targeted build scoped to the app or service you touched over a global build. Check `package.json` scripts or the monorepo tool's filter syntax (e.g. `pnpm --filter <package> build`, `pnpm build:<target-app>`) for a scoped command. Only fall back to a global build if no targeted option exists.

## File naming and string casing

Prefer kebab-case over camelCase, PascalCase, and snake_case for file names and string literals, including union type or enum values in TypeScript.

- File names: `user-auth-utils.ts` not `userAuthUtils.ts` or `UserAuthUtils.ts`
- String literals: `'active-user'` not `'activeUser'`, `'ActiveUser'`, or `'active_user'`

## Commit messages and PR titles

Use Conventional Commits format: `<type>(<optional scope>): <short description>`

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `ci`

- `feat(auth): add OAuth2 login flow`
- `fix(api): handle null response from user endpoint`