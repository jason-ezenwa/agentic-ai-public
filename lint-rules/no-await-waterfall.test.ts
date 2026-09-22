import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noAwaitWaterfall } from './no-await-waterfall.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const waterfall = (count: number) => ({
  messageId: 'awaitWaterfall',
  data: { count: String(count) },
})

ruleTester.run('no-await-waterfall', noAwaitWaterfall, {
  valid: [
    // a single await is never a waterfall
    `async function Page() {\n  const user = await fetchUser()\n  return user\n}`,
    // a chain where each await uses the previous result
    `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts(user.id)\n  const comments = await fetchComments(posts[0])\n  return comments\n}`,
    // a destructured result the next await reads
    `async function Page() {\n  const { id } = await fetchUser()\n  const posts = await fetchPosts(id)\n  return posts\n}`,
    // an array-destructured result the next await reads
    `async function Page() {\n  const [first] = await fetchUsers()\n  const posts = await fetchPosts(first)\n  return posts\n}`,
    // awaits separated by a non-await statement end the run
    `async function Page() {\n  const user = await fetchUser()\n  log(user)\n  const posts = await fetchPosts()\n  return posts\n}`,
    // awaits in different blocks are different runs
    `async function Page(flag) {\n  if (flag) {\n    const user = await fetchUser()\n  } else {\n    const posts = await fetchPosts()\n  }\n}`,
    // the independent calls already run together
    `async function Page() {\n  const [user, posts] = await Promise.all([fetchUser(), fetchPosts()])\n  return { user, posts }\n}`,
    // a reassignment chain that reads the previous value
    `async function usePages() {\n  let page = await fetchPage()\n  page = await fetchNext(page)\n}`,
    // a second await that reads the first's declared name is still a chain
    `async function Page() {\n  const token = await fetchToken()\n  const user = await fetchUser({ token })\n  return user\n}`,
    // a multi-declarator declaration is not part of a run
    `async function Page() {\n  const user = await fetchUser(), limit = 10\n  const posts = await fetchPosts()\n}`,
    // a dependent chain, asserting dependency detection inside a component
    `async function Page() {\n  const config = await loadConfig()\n  const db = await connect(config.url)\n}`,

    // skipped context: a `'use server'` function, even one otherwise checked
    `export async function loader() {\n  'use server'\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
    // skipped context: a file whose first statement is `'use server'`
    `'use server'\nasync function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
    // skipped context: an exported POST handler in a route file
    {
      code: `export async function POST() {\n  const user = await createUser()\n  const audit = await writeAudit()\n}`,
      filename: 'app/users/route.ts',
    },
    // skipped context: a plain exported utility function
    `export async function syncUsers() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
    // skipped context: a class method
    `class UserService {\n  async sync() {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n}`,
    // skipped context: top-level await in a plain module
    `const user = await fetchUser()\nconst posts = await fetchPosts()`,
    // an all-caps name is not a component, so `GET` outside a route file is skipped
    {
      code: `export async function GET() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'src/lib/http.ts',
    },
    // a write verb outside a route file is skipped too
    {
      code: `export async function POST() {\n  const user = await createUser()\n  const audit = await writeAudit()\n}`,
      filename: 'src/lib/http.ts',
    },
    // a PascalCase class method is not a component
    `class Dashboard {\n  async Page() {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n}`,
    // `'use strict'` ahead of the file-level `'use server'` still marks the file
    `'use strict'\n'use server'\nasync function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
    // `'use strict'` ahead of a body's `'use server'` still marks the function
    `export async function loader() {\n  'use strict'\n  'use server'\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
    // a bare await discards its result: it is a gate, so it ends the run
    `async function Page() {\n  await requireSession()\n  const user = await fetchUser()\n}`,
    // an assignment into a member is not a run member, so the chain through it holds
    `async function Page(out) {\n  out.user = await fetchUser()\n  const posts = await fetchPosts(out.user.id)\n}`,
    // a member target inside a destructuring pattern binds no followable name
    `async function Page(o) {\n  ;({ user: o.user } = await fetchUser())\n  const posts = await fetchPosts(o.user.id)\n}`,
    // `'use server'` is inherited by a component-named function nested in it
    `export async function loader() {\n  'use server'\n  async function Row() {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n}`,
    // and by a hook-named function nested in it
    `export async function loader() {\n  'use server'\n  async function useRow() {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n}`,
    // a callback is judged on its own: ordered writes in an onSubmit handler
    `function Page() {\n  const onSubmit = async () => {\n    const saved = await saveDraft()\n    const published = await publish()\n  }\n  return onSubmit\n}`,
  ],
  invalid: [
    // checked context: a React component
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n  return { user, posts }\n}`,
      errors: [waterfall(2)],
    },
    // checked context: a hook
    {
      code: `async function useDashboard() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: getServerSideProps
    {
      code: `export async function getServerSideProps() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: getStaticProps
    {
      code: `export async function getStaticProps() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: generateMetadata
    {
      code: `export async function generateMetadata() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: generateStaticParams
    {
      code: `export async function generateStaticParams() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: an exported `loader`, as an arrow
    {
      code: `export const loader = async () => {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // checked context: a GET handler in an app route file
    {
      code: `export async function GET() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'app/users/route.ts',
      errors: [waterfall(2)],
    },
    // checked context: the default export of a pages/api file
    {
      code: `export default async function handler() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'pages/api/users.ts',
      errors: [waterfall(2)],
    },
    // three independent const awaits, count reported
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n  const comments = await fetchComments()\n}`,
      errors: [waterfall(3)],
    },
    // `let` declarations count as run members
    {
      code: `async function Page() {\n  let user = await fetchUser()\n  let posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // plain assignment to an existing binding counts
    {
      code: `async function Page() {\n  let user\n  let posts\n  user = await fetchUser()\n  posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // a mixed run: the third await ignores both earlier results
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts(user.id)\n  const settings = await fetchSettings()\n}`,
      errors: [waterfall(3)],
    },
    // destructured binding that the later await does not read
    {
      code: `async function Page() {\n  const { id } = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [waterfall(2)],
    },
    // a member-expression property name that merely matches a binding is not a read
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts(payload.user)\n}`,
      errors: [waterfall(2)],
    },
    // two independent runs in one component report separately
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n  log(user, posts)\n  const a = await fetchA()\n  const b = await fetchB()\n}`,
      errors: [waterfall(2), waterfall(2)],
    },
    // awaits inside a nested block report against that block
    {
      code: `async function Page(flag) {\n  if (flag) {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n}`,
      errors: [waterfall(2)],
    },
    // a run inside a loop body is reported on purpose
    {
      code: `async function Page(ids) {\n  for (const id of ids) {\n    const user = await fetchUser(id)\n    const posts = await fetchPosts()\n  }\n}`,
      errors: [waterfall(2)],
    },
    // checked context: the anonymous default export of an App Router page
    {
      code: `export default async function () {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'app/users/page.tsx',
      errors: [waterfall(2)],
    },
    // a named component-like arrow inside a component is still checked
    {
      code: `function Page() {\n  const Row = async () => {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  }\n  return Row\n}`,
      errors: [waterfall(2)],
    },
    // checked context: the default export of an App Router template
    {
      code: `export default async function () {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'app/x/template.tsx',
      errors: [waterfall(2)],
    },
    // checked context: the default export of an App Router layout
    {
      code: `export default async function Layout() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      filename: 'app/layout.tsx',
      errors: [waterfall(2)],
    },
    // a type argument that merely matches a binding is not a data dependency
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts<user>()\n}`,
      errors: [waterfall(2)],
    },
    // awaits inside a try block report: a try block is a block
    {
      code: `async function Page() {\n  try {\n    const user = await fetchUser()\n    const posts = await fetchPosts()\n  } catch (error) {}\n}`,
      errors: [waterfall(2)],
    },
    // reported location is the first statement of the run
    {
      code: `async function Page() {\n  const user = await fetchUser()\n  const posts = await fetchPosts()\n}`,
      errors: [{ messageId: 'awaitWaterfall', line: 2, column: 3, endLine: 2, endColumn: 33 }],
    },
  ],
})
