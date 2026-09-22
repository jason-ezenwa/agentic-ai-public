// Flags a regex built inside a component or hook body. `/x/` and
// `new RegExp(...)` allocate and compile on every render, and a `/g` regex
// carries mutable `lastIndex` state that a re-render silently resets. A static
// pattern belongs at module scope; one that depends on props or state belongs in
// `useMemo`, which is the one place this rule allows. Nested callbacks (event
// handlers, `.map` bodies) count as inside the component — they are recreated
// with it. Decisions where the shape is ambiguous: a function counts as a
// component or hook by name only (its own name, or the PascalCase/`useX`
// identifier it is assigned to), and `useMemo` is matched by callee name. Class
// components are out of scope — a regex in a `render()` method is not flagged.

const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/
const HOOK_NAME = /^use[A-Z]/

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

// A function passed as an argument to `useMemo(...)` — the sanctioned home for
// a regex that has to be rebuilt when its inputs change.
function isUseMemoCallback(node) {
  const parent = node.parent
  if (!parent || parent.type !== 'CallExpression') return false
  if (!parent.arguments.includes(node)) return false
  const callee = parent.callee
  if (callee.type === 'Identifier') return callee.name === 'useMemo'
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'useMemo'
  )
}

export const noRegexpInRender = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow regex literals and RegExp construction inside a React component or hook body; hoist them to module scope or build them in useMemo.',
    },
    schema: [],
    messages: {
      regexpInRender:
        'Regex is created on every render. Hoist it to module scope, or build it in useMemo if it depends on props or state.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    // Walks out of the regex towards module scope. The first `useMemo` callback
    // on the way out makes it fine; a component or hook body makes it a report.
    function enclosingComponentOrHook(node) {
      const ancestors = sourceCode.getAncestors
        ? sourceCode.getAncestors(node)
        : context.getAncestors()
      for (let index = ancestors.length - 1; index >= 0; index -= 1) {
        const ancestor = ancestors[index]
        if (!isFunctionNode(ancestor)) continue
        if (isUseMemoCallback(ancestor)) return null
        if (isComponentOrHookName(functionName(ancestor))) return ancestor
      }
      return null
    }

    // `RegExp`, `window.RegExp` and `globalThis.RegExp` all name the same
    // constructor.
    function isRegExpCallee(callee) {
      if (callee.type === 'Identifier') return callee.name === 'RegExp'
      return (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'RegExp' &&
        callee.object.type === 'Identifier' &&
        (callee.object.name === 'window' || callee.object.name === 'globalThis')
      )
    }

    function report(node) {
      if (!enclosingComponentOrHook(node)) return
      context.report({ node, messageId: 'regexpInRender' })
    }

    return {
      Literal(node) {
        if (node.regex) report(node)
      },
      NewExpression(node) {
        if (isRegExpCallee(node.callee)) report(node)
      },
      CallExpression(node) {
        if (isRegExpCallee(node.callee)) report(node)
      },
    }
  },
}
