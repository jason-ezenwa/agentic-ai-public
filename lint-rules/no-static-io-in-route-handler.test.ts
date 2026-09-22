import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noStaticIoInRouteHandler } from './no-static-io-in-route-handler.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const routeFile = 'app/api/og/route.ts'
const apiFile = 'pages/api/og.ts'
const staticIo = { messageId: 'staticIoInRouteHandler' }

ruleTester.run('no-static-io-in-route-handler', noStaticIoInRouteHandler, {
  valid: [
    // a file that is not a route handler is not checked at all
    {
      code: `export async function GET() {\n  const font = await fetch('https://cdn.example.com/Inter.ttf')\n  return new Response(font.body)\n}`,
      filename: 'app/api/og/helpers.ts',
    },
    // a component file with the same call shape
    {
      code: `export async function GET() {\n  await fetch('/logo.png')\n}`,
      filename: 'src/lib/og.ts',
    },
    // the read hoisted to module scope in a route file
    {
      code: `import { readFileSync } from 'fs'\nconst font = readFileSync('public/Inter.ttf')\nexport async function GET() {\n  return new Response(font)\n}`,
      filename: routeFile,
    },
    // a module-scope fetch promise awaited in the handler
    {
      code: `const fontPromise = fetch('https://cdn.example.com/Inter.ttf')\nexport async function GET() {\n  const font = await fontPromise\n  return new Response(font.body)\n}`,
      filename: routeFile,
    },
    // a fetch with a computed URL inside a handler
    {
      code: `export async function GET(request) {\n  const res = await fetch(request.nextUrl.searchParams.get('u'))\n  return res\n}`,
      filename: routeFile,
    },
    // a fetch with an interpolating template literal inside a handler
    {
      code: `export async function GET(request) {\n  const res = await fetch(\`https://api.example.com/\${request.headers.get('x-id')}\`)\n  return res\n}`,
      filename: routeFile,
    },
    // an fs read with a computed path inside a handler
    {
      code: `import fs from 'fs'\nexport async function GET(request) {\n  const body = await fs.promises.readFile(join(dir, request.id))\n  return new Response(body)\n}`,
      filename: routeFile,
    },
    // the same calls inside a non-handler function in a route file
    {
      code: `import { readFile } from 'fs/promises'\nasync function loadTemplate() {\n  return readFile('templates/mail.html', 'utf-8')\n}\nexport async function GET() {\n  return new Response(await loadTemplate())\n}`,
      filename: routeFile,
    },
    // an exported function in a route file that is not a handler verb
    {
      code: `export async function revalidate() {\n  await fetch('https://cdn.example.com/Inter.ttf')\n}`,
      filename: routeFile,
    },
    // a readFile-looking call not imported from fs
    {
      code: `import { readFile } from './my-cache'\nexport async function GET() {\n  return new Response(await readFile('templates/mail.html'))\n}`,
      filename: routeFile,
    },
    // a local binding named `fs` that never came from the fs module
    {
      code: `export async function GET() {\n  const fs = mock()\n  return new Response(fs.readFileSync('config.json'))\n}`,
      filename: routeFile,
    },
    // an App Router route file has no default handler, so its default export is
    // not treated as one
    {
      code: `export default async function handler() {\n  await fetch('https://cdn.example.com/Inter.ttf')\n}`,
      filename: routeFile,
    },
  ],
  invalid: [
    // fetch of a string-literal URL in a GET handler
    {
      code: `export async function GET() {\n  const font = await fetch('https://cdn.example.com/Inter.ttf')\n  return new Response(font.body)\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // fetch of a template literal with no expressions
    {
      code: `export async function GET() {\n  const font = await fetch(\`https://cdn.example.com/Inter.ttf\`)\n  return new Response(font.body)\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // fs.readFile inside a POST handler
    {
      code: `import fs from 'fs'\nexport async function POST() {\n  const body = await fs.readFile('templates/mail.html', 'utf-8')\n  return new Response(body)\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // fs.readFileSync inside a PUT handler
    {
      code: `import fs from 'fs'\nexport async function PUT() {\n  const body = fs.readFileSync('templates/mail.html', 'utf-8')\n  return new Response(body)\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // fs.promises.readFile inside a PATCH handler
    {
      code: `import fs from 'node:fs'\nexport async function PATCH() {\n  const body = await fs.promises.readFile('config.json', 'utf-8')\n  return new Response(body)\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // a named readFile import from fs/promises inside a DELETE handler
    {
      code: `import { readFile } from 'fs/promises'\nexport async function DELETE() {\n  return new Response(await readFile('config.json', 'utf-8'))\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // a named readFileSync import from fs inside a HEAD handler
    {
      code: `import { readFileSync } from 'fs'\nexport async function HEAD() {\n  return new Response(readFileSync('config.json'))\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // an OPTIONS handler declared as an exported arrow function
    {
      code: `export const OPTIONS = async () => {\n  await fetch('https://cdn.example.com/Inter.ttf')\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // the default export of a pages/api file
    {
      code: `export default async function handler(req, res) {\n  const font = await fetch('https://cdn.example.com/Inter.ttf')\n  res.end(font.body)\n}`,
      filename: apiFile,
      errors: [staticIo],
    },
    // a nested pages/api file
    {
      code: `export default async function handler(req, res) {\n  await fetch('/logo.png')\n}`,
      filename: 'pages/api/og/image.js',
      errors: [staticIo],
    },
    // a nested route segment and a .tsx route file
    {
      code: `export async function GET() {\n  await fetch('https://cdn.example.com/logo.png')\n}`,
      filename: 'src/app/(marketing)/api/og/route.tsx',
      errors: [staticIo],
    },
    // a read nested in a callback inside the handler
    {
      code: `import { readFileSync } from 'fs'\nexport async function GET() {\n  const parts = ['a'].map(() => readFileSync('config.json'))\n  return new Response(parts.join(''))\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // two static reads in one handler report twice
    {
      code: `import fs from 'fs'\nexport async function GET() {\n  const font = await fetch('https://cdn.example.com/Inter.ttf')\n  const logo = await fs.promises.readFile('public/logo.png')\n  return new Response(logo)\n}`,
      filename: routeFile,
      errors: [staticIo, staticIo],
    },
    // a namespace bound by `const fs = require('fs')`
    {
      code: `const fs = require('fs')\nexport async function GET() {\n  return new Response(fs.readFileSync('config.json'))\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // a reader destructured from `require('node:fs/promises')`
    {
      code: `const { readFile } = require('node:fs/promises')\nexport async function GET() {\n  return new Response(await readFile('config.json'))\n}`,
      filename: routeFile,
      errors: [staticIo],
    },
    // a handler wrapped one level in a call
    {
      code: `export const GET = withAuth(async () => {\n  await fetch('https://cdn.example.com/Inter.ttf')\n})`,
      filename: routeFile,
      errors: [staticIo],
    },
    // reported location covers the whole call expression
    {
      code: `export async function GET() {\n  await fetch('https://a.example.com/x.ttf')\n}`,
      filename: routeFile,
      errors: [
        {
          messageId: 'staticIoInRouteHandler',
          line: 2,
          column: 9,
          endLine: 2,
          endColumn: 45,
        },
      ],
    },
  ],
})
