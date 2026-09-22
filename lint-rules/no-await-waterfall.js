// Flags a run of consecutive awaits where a later call does not use an earlier
// result: those round trips are independent and should overlap under
// `Promise.all`. It checks React and Next.js data-loading code only, decided by
// function name and export shape — components, hooks, the Next data functions,
// `GET` (the one handler verb checked) — with no notion of file location beyond
// route, page and layout files; it lives in the web rule set, so it never runs
// on a backend package. A run is made of awaits whose result is bound: a bare
// `await` is a gate and ends a run, as does a multi-declarator declaration or
// an assignment to a member. Every block counts, a `try` or a loop body too.

const AWAIT_RUN_MINIMUM = 2

// The names a statement binds, so a later await referencing one of them is a
// real data dependency. Destructured and nested patterns all contribute.
function patternNames(pattern, names) {
  if (!pattern) return names
  switch (pattern.type) {
    case 'Identifier':
      names.push(pattern.name)
      break
    case 'ObjectPattern':
      for (const prop of pattern.properties) {
        patternNames(prop.type === 'RestElement' ? prop.argument : prop.value, names)
      }
      break
    case 'ArrayPattern':
      for (const element of pattern.elements) patternNames(element, names)
      break
    case 'AssignmentPattern':
      patternNames(pattern.left, names)
      break
    case 'RestElement':
      patternNames(pattern.argument, names)
      break
    default:
      break
  }
  return names
}

// Identifiers the awaited expression reads. Non-computed member property names,
// object literal keys and TypeScript type positions are not reads, so they are
// skipped.
const NON_VALUE_KEYS = new Set([
  'parent',
  'loc',
  'range',
  'typeParameters',
  'typeAnnotation',
  'typeArguments',
])
function referencedNames(node, names = new Set()) {
  if (!node || typeof node.type !== 'string') return names
  if (node.type === 'Identifier') {
    names.add(node.name)
    return names
  }
  for (const key of Object.keys(node)) {
    if (NON_VALUE_KEYS.has(key)) continue
    if (node.type === 'MemberExpression' && key === 'property' && !node.computed) continue
    if (node.type === 'Property' && key === 'key' && !node.computed) continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const item of value) referencedNames(item, names)
    } else if (value && typeof value.type === 'string') {
      referencedNames(value, names)
    }
  }
  return names
}

// A statement is part of a run when it is one await whose result is bound:
// `const x = await f()`, `let x = await f()`, or `x = await f()`. A bare
// `await f()` discards its result, so it is a gate, not a read, and is left out.
// An assignment that binds no name this rule can follow (`out.user = await f()`,
// `({ user: o.user } = await f())`) is left out too rather than read as
// independent.
const ASSIGNMENT_TARGETS = new Set(['Identifier', 'ObjectPattern', 'ArrayPattern'])
function awaitStatement(statement) {
  if (statement.type === 'VariableDeclaration') {
    if (statement.declarations.length !== 1) return null
    const declarator = statement.declarations[0]
    if (!declarator.init || declarator.init.type !== 'AwaitExpression') return null
    return {
      statement,
      bindings: patternNames(declarator.id, []),
      reads: referencedNames(declarator.init.argument),
    }
  }
  if (statement.type !== 'ExpressionStatement') return null
  const expression = statement.expression
  if (
    expression.type === 'AssignmentExpression' &&
    expression.operator === '=' &&
    expression.right.type === 'AwaitExpression' &&
    ASSIGNMENT_TARGETS.has(expression.left.type)
  ) {
    const bindings = patternNames(expression.left, [])
    if (bindings.length === 0) return null
    return { statement, bindings, reads: referencedNames(expression.right.argument) }
  }
  return null
}

// True when some statement after the first reads nothing bound earlier in the
// run. Dependencies are transitive by construction: a statement that only
// reads a mid-run result still reads a statement that came earlier, so a direct
// check against every earlier statement covers the whole chain.
function hasIndependentAwait(run) {
  for (let index = 1; index < run.length; index += 1) {
    const dependent = run
      .slice(0, index)
      .some((earlier) => earlier.bindings.some((name) => run[index].reads.has(name)))
    if (!dependent) return true
  }
  return false
}

// A React component or hook is recognised by name alone, the same way
// no-regexp-in-render does it.
// At least one lowercase letter, so an all-caps name like `GET` is not a
// component; `GET` is reached only through the route-file path.
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/
const HOOK_NAME = /^use[A-Z]/

// Next.js functions whose whole job is loading data for a render.
const NEXT_DATA_FUNCTIONS = new Set([
  'getServerSideProps',
  'getStaticProps',
  'generateMetadata',
  'generateStaticParams',
  'loader',
])

// `GET` is the only handler verb this rule checks; every other verb is left
// alone, whatever its body does.
const UNCHECKED_HANDLER_NAMES = new Set(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

// Route filenames, matched the same way no-static-io-in-route-handler does it.
const ROUTE_FILE = /(^|\/)app\/(.*\/)?route\.(ts|js|tsx|jsx)$/
const API_FILE = /(^|\/)pages\/api\/.+\.(ts|js)$/
// An App Router page, layout, template or default slot default-exports its
// component, often anonymously.
const COMPONENT_FILE = /(^|\/)app\/(.*\/)?(page|layout|template|default)\.(ts|js|tsx|jsx)$/

function isComponentOrHookName(name) {
  return typeof name === 'string' && (COMPONENT_NAME.test(name) || HOOK_NAME.test(name))
}

function isFunctionNode(node) {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

// The name a function is known by: its own identifier, or the identifier it is
// declared into (`const Badge = () => ...`, `Badge = () => ...`).
function functionName(node) {
  if (node.id && node.id.type === 'Identifier') return node.id.name
  const parent = node.parent
  if (!parent) return null
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name
  }
  if (
    parent.type === 'AssignmentExpression' &&
    parent.left.type === 'Identifier' &&
    parent.right === node
  ) {
    return parent.left.name
  }
  return null
}

// The declaration a function is exported under, allowing one wrapping call
// (`export const GET = withAuth(fn)`). Null when the function is not exported.
function exportedName(node) {
  if (node.type === 'FunctionDeclaration' && node.id && node.parent) {
    if (node.parent.type === 'ExportNamedDeclaration') return node.id.name
  }
  let candidate = node
  if (candidate.parent && candidate.parent.type === 'CallExpression') candidate = candidate.parent
  const declarator = candidate.parent
  if (!declarator || declarator.type !== 'VariableDeclarator') return null
  if (declarator.id.type !== 'Identifier') return null
  const declaration = declarator.parent
  if (!declaration || !declaration.parent) return null
  if (declaration.parent.type !== 'ExportNamedDeclaration') return null
  return declarator.id.name
}

function isDefaultExported(node) {
  let candidate = node
  if (candidate.parent && candidate.parent.type === 'CallExpression') candidate = candidate.parent
  return Boolean(candidate.parent && candidate.parent.type === 'ExportDefaultDeclaration')
}

// `'use server'` marks a mutation, whether it heads a function body or a file.
function hasUseServerDirective(statements) {
  for (const statement of statements) {
    if (statement.type !== 'ExpressionStatement') return false
    const value = statement.directive ?? statement.expression?.value
    if (typeof value !== 'string') return false
    if (value === 'use server') return true
  }
  return false
}

function marksUseServer(node) {
  const body = node.body
  if (!body || body.type !== 'BlockStatement') return false
  return hasUseServerDirective(body.body)
}

export const noAwaitWaterfall = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow consecutive awaits in one block when a later await does not use an earlier result; run the independent calls with Promise.all.',
    },
    schema: [],
    messages: {
      awaitWaterfall:
        '{{count}} sequential awaits with no data dependency between them. Run the independent calls with Promise.all.',
    },
  },
  create(context) {
    const filename = String(context.filename ?? context.getFilename()).replace(/\\/g, '/')
    const isRouteFile = ROUTE_FILE.test(filename) || API_FILE.test(filename)
    const routesDefaultExport = API_FILE.test(filename)
    const isComponentFile = COMPONENT_FILE.test(filename)
    let fileMarksUseServer = false

    // A function this rule reads as data loading: a component or hook by name,
    // a Next data function, a `GET` handler in a route file, or the default
    // export of a `pages/api` file, an App Router page or a layout.
    function isDataLoadingFunction(node) {
      if (isComponentOrHookName(functionName(node))) return true
      const exported = exportedName(node)
      if (exported && NEXT_DATA_FUNCTIONS.has(exported)) return true
      if (exported && UNCHECKED_HANDLER_NAMES.has(exported)) return false
      if (isRouteFile && exported === 'GET') return true
      if (!isDefaultExported(node)) return false
      return routesDefaultExport || isComponentFile
    }

    // Only the nearest enclosing function decides whether this is data loading,
    // judged on its own name and export shape: a named inner component
    // (`const Row = async () => ...`) is checked, an anonymous callback is not.
    // `'use server'` is inherited, though — it marks everything nested in it.
    function isCheckedContext(node) {
      if (fileMarksUseServer) return false
      let verdict = false
      let nearest = true
      for (let current = node.parent; current; current = current.parent) {
        if (!isFunctionNode(current)) continue
        if (marksUseServer(current)) return false
        if (nearest) {
          verdict = isDataLoadingFunction(current)
          nearest = false
        }
      }
      return verdict
    }

    function checkBody(node, statements) {
      if (!isCheckedContext(node)) return
      let run = []
      const flush = () => {
        if (run.length >= AWAIT_RUN_MINIMUM && hasIndependentAwait(run)) {
          context.report({
            node: run[0].statement,
            messageId: 'awaitWaterfall',
            data: { count: String(run.length) },
          })
        }
        run = []
      }
      for (const statement of statements) {
        const info = awaitStatement(statement)
        if (info) {
          run.push(info)
          continue
        }
        flush()
      }
      flush()
    }

    return {
      Program: (node) => {
        fileMarksUseServer = hasUseServerDirective(node.body)
      },
      BlockStatement: (node) => checkBody(node, node.body),
      StaticBlock: (node) => checkBody(node, node.body),
      SwitchCase: (node) => checkBody(node, node.consequent),
    }
  },
}
