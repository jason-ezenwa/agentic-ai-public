// Flags a static asset read inside a Next.js route handler — a font, a logo, a
// config or template file loaded with `fs` or fetched from a fixed URL. Module
// scope runs once per instance; a handler body runs on every request, so the
// same bytes are read again for each one. Only files that are route handlers
// (`app/**/route.*`, `pages/api/**`) are checked. Decisions where the spec is
// open: the static-argument test applies to the `fs` reads as well as `fetch`
// (a computed path varies per request, so it is left alone); a handler is an
// exported function declaration or variable, optionally wrapped one level in a
// call (`export const GET = withAuth(fn)`), and a default export only in
// `pages/api` — an App Router route file has no default handler; a re-export
// (`export { GET }`) is not detected. `fs` bindings come from imports or from
// `const fs = require('fs')` / `const { readFile } = require('fs')`; no other
// CJS spelling is recognised.

const HANDLER_NAMES = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const ROUTE_FILE = /(^|\/)app\/(.*\/)?route\.(ts|js|tsx|jsx)$/
const API_FILE = /(^|\/)pages\/api\/.+\.(ts|js)$/
const FS_MODULE = /^(node:)?fs(\/promises)?$/
const FS_READERS = new Set(['readFile', 'readFileSync'])

function isRouteFile(filename) {
  const normalized = String(filename).replace(/\\/g, '/')
  return ROUTE_FILE.test(normalized) || API_FILE.test(normalized)
}

// Only a `pages/api` file routes its default export; an App Router route file
// exports one function per verb and no default.
function hasDefaultHandler(filename) {
  return API_FILE.test(String(filename).replace(/\\/g, '/'))
}

function isFunctionNode(node) {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

// A path or URL fixed at build time: a string literal, or a template literal
// with no interpolation. Anything computed varies per request.
function isStaticArgument(node) {
  if (!node) return false
  if (node.type === 'Literal') return typeof node.value === 'string'
  return node.type === 'TemplateLiteral' && node.expressions.length === 0
}

// `fs.readFile`, `fs.readFileSync`, `fs.promises.readFile` — the namespace name
// is whatever the import bound, so it is matched by shape, not by a fixed name.
function isFsMemberRead(callee, fsNamespaces) {
  if (callee.type !== 'MemberExpression' || callee.computed) return false
  if (callee.property.type !== 'Identifier' || !FS_READERS.has(callee.property.name)) return false
  const object = callee.object
  if (object.type === 'Identifier') return fsNamespaces.has(object.name)
  return (
    object.type === 'MemberExpression' &&
    !object.computed &&
    object.property.type === 'Identifier' &&
    object.property.name === 'promises' &&
    object.object.type === 'Identifier' &&
    fsNamespaces.has(object.object.name)
  )
}

export const noStaticIoInRouteHandler = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow request-time reads of static assets (fs reads, fetches of a fixed URL) inside a Next.js route handler; hoist them to module scope.',
    },
    schema: [],
    messages: {
      staticIoInRouteHandler:
        'Static asset is loaded on every request. Move the read to module scope so it runs once.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (!isRouteFile(filename)) return {}

    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const fsNamespaces = new Set()
    const fsReaders = new Set()
    const handlers = new Set()

    // `require('fs')` and friends — the only CJS spelling this rule reads.
    function isFsRequire(node) {
      return (
        node &&
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        FS_MODULE.test(String(node.arguments[0].value))
      )
    }

    function collectRequire(node) {
      for (const declarator of node.declarations) {
        if (!isFsRequire(declarator.init)) continue
        if (declarator.id.type === 'Identifier') {
          fsNamespaces.add(declarator.id.name)
          continue
        }
        if (declarator.id.type !== 'ObjectPattern') continue
        for (const prop of declarator.id.properties) {
          if (
            prop.type === 'Property' &&
            prop.key.type === 'Identifier' &&
            FS_READERS.has(prop.key.name) &&
            prop.value.type === 'Identifier'
          ) {
            fsReaders.add(prop.value.name)
          }
        }
      }
    }

    function collectImport(node) {
      if (!FS_MODULE.test(String(node.source.value))) return
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportSpecifier' && FS_READERS.has(specifier.imported.name)) {
          fsReaders.add(specifier.local.name)
        } else if (
          specifier.type === 'ImportDefaultSpecifier' ||
          specifier.type === 'ImportNamespaceSpecifier'
        ) {
          fsNamespaces.add(specifier.local.name)
        }
      }
    }

    // The handler body itself, or — when the export is wrapped one level in a
    // call (`withAuth(async () => ...)`) — each function argument of that call.
    function addHandler(node) {
      if (!node) return
      if (isFunctionNode(node)) {
        handlers.add(node)
        return
      }
      if (node.type !== 'CallExpression') return
      for (const argument of node.arguments) {
        if (isFunctionNode(argument)) handlers.add(argument)
      }
    }

    function collectHandlers(node) {
      const declaration = node.declaration
      if (!declaration) return
      if (node.type === 'ExportDefaultDeclaration') {
        if (hasDefaultHandler(filename)) addHandler(declaration)
        return
      }
      if (declaration.type === 'FunctionDeclaration' && HANDLER_NAMES.has(declaration.id?.name)) {
        handlers.add(declaration)
        return
      }
      if (declaration.type === 'VariableDeclaration') {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === 'Identifier' && HANDLER_NAMES.has(declarator.id.name)) {
            addHandler(declarator.init)
          }
        }
      }
    }

    function insideHandler(node) {
      const ancestors = sourceCode.getAncestors
        ? sourceCode.getAncestors(node)
        : context.getAncestors()
      return ancestors.some((ancestor) => handlers.has(ancestor))
    }

    return {
      ImportDeclaration: collectImport,
      VariableDeclaration: collectRequire,
      ExportNamedDeclaration: collectHandlers,
      ExportDefaultDeclaration: collectHandlers,
      'CallExpression:exit'(node) {
        const callee = node.callee
        const isFetch = callee.type === 'Identifier' && callee.name === 'fetch'
        const isRead =
          isFsMemberRead(callee, fsNamespaces) ||
          (callee.type === 'Identifier' && fsReaders.has(callee.name))
        if (!isFetch && !isRead) return
        if (!isStaticArgument(node.arguments[0])) return
        if (!insideHandler(node)) return
        context.report({ node, messageId: 'staticIoInRouteHandler' })
      },
    }
  },
}
