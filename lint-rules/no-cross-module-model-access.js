// A NestJS module reads and writes only the collections it owns, and reaches
// another module's data through that module's service. Flags model access built
// from another module's schema:
// `@InjectModel(X.name)` and `MongooseModule.forFeature([...])` entries.
// A file belongs to the nearest folder above it holding a `*.module.ts`, so a
// nested folder with its own module file is a separate module. Types, enums and
// constants from a schema file are not model access and stay allowed.
// NestJS / Mongoose specific, relative imports of `*.schema` files only.

import fs from 'node:fs'
import path from 'node:path'

const SCHEMA_SOURCE = /\.schema(\.[cm]?[jt]s)?$/
const FOR_FEATURE_METHODS = new Set(['forFeature', 'forFeatureAsync'])

const moduleDirCache = new Map()

function listDir(dir) {
  try {
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

// The nearest folder holding a `*.module.ts`, searched up to the package root.
function moduleDirOf(file) {
  let dir = path.dirname(file)
  const visited = []
  let found = null
  for (;;) {
    if (moduleDirCache.has(dir)) {
      found = moduleDirCache.get(dir)
      break
    }
    visited.push(dir)
    const entries = listDir(dir)
    if (entries.some((entry) => entry.endsWith('.module.ts'))) {
      found = dir
      break
    }
    const parent = path.dirname(dir)
    if (entries.includes('package.json') || parent === dir) break
    dir = parent
  }
  for (const seen of visited) moduleDirCache.set(seen, found)
  return found
}

function isTypeOnly(node, specifier) {
  return node.importKind === 'type' || specifier.importKind === 'type'
}

// `X.name` or a bare `X`, the two shapes a model name takes.
function modelNameIdentifier(node) {
  if (!node) return null
  if (node.type === 'Identifier') return node
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'name'
  ) {
    return node.object
  }
  return null
}

function findForeignIdentifier(node, foreign) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'Identifier') return foreign.has(node.name) ? node : null
  // A plain key or `.name` is a label, not a reference.
  if (node.type === 'Property' && !node.computed) return findForeignIdentifier(node.value, foreign)
  if (node.type === 'MemberExpression' && !node.computed) {
    return findForeignIdentifier(node.object, foreign)
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue
    const children = Array.isArray(value) ? value : [value]
    for (const child of children) {
      if (child && typeof child.type === 'string') {
        const hit = findForeignIdentifier(child, foreign)
        if (hit) return hit
      }
    }
  }
  return null
}

export const noCrossModuleModelAccess = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow injecting or registering a Mongoose model whose schema belongs to another NestJS module.",
    },
    schema: [],
    messages: {
      crossModuleModelAccess:
        "'{{name}}' is owned by the '{{owner}}' module. Use {{owner}}'s service for its data instead of its model; types and enums can still come from the schema file.",
    },
  },
  create(context) {
    const filename = context.filename
    const ownModule = moduleDirOf(filename)
    if (!ownModule) return {}

    // Local import name → owning module folder, for runtime imports only.
    const foreign = new Map()

    function report(identifier) {
      context.report({
        node: identifier,
        messageId: 'crossModuleModelAccess',
        data: {
          name: identifier.name,
          owner: path.basename(foreign.get(identifier.name)),
        },
      })
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string' || !source.startsWith('.')) return
        if (!SCHEMA_SOURCE.test(source)) return
        const target = path.resolve(path.dirname(filename), source)
        const owner = moduleDirOf(target)
        if (!owner || owner === ownModule) return
        for (const specifier of node.specifiers) {
          if (isTypeOnly(node, specifier)) continue
          foreign.set(specifier.local.name, owner)
        }
      },
      CallExpression(node) {
        if (foreign.size === 0) return
        const callee = node.callee
        if (callee.type === 'Identifier' && callee.name === 'InjectModel') {
          const identifier = modelNameIdentifier(node.arguments[0])
          if (identifier && foreign.has(identifier.name)) report(identifier)
          return
        }
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.type === 'Identifier' &&
          FOR_FEATURE_METHODS.has(callee.property.name)
        ) {
          const entries = node.arguments[0]
          if (!entries || entries.type !== 'ArrayExpression') return
          for (const entry of entries.elements) {
            const identifier = findForeignIdentifier(entry, foreign)
            if (identifier) report(identifier)
          }
        }
      },
    }
  },
}
