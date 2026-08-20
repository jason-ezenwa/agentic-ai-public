// Flags Tailwind color utilities that bypass the design-token system: literal
// colors like `bg-white`/`text-black`, and arbitrary hex values like `bg-[#fff]`.
// Catches them in JSX `className` and in `cn`/`clsx`/`cva`/`classNames`/`twMerge` calls.

const LITERAL_COLOR = /^(?:bg|text)-(?:white|black)$/
const ARBITRARY_COLOR =
  /^(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|caret|accent|divide|shadow)-\[#[0-9a-fA-F]{3,8}\]$/

const CLASS_HELPER_NAMES = new Set(['cn', 'clsx', 'cva', 'classNames', 'twMerge'])

function findViolation(token) {
  if (LITERAL_COLOR.test(token)) return token
  if (ARBITRARY_COLOR.test(token)) return token
  return null
}

export const noHardcodedTailwindColors = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded Tailwind color utilities (e.g. bg-white, text-black, arbitrary hex colors) in favor of theme tokens.',
    },
    schema: [],
    messages: {
      hardcodedColor:
        '"{{token}}" is a hardcoded color class. Use a theme token instead (e.g. bg-background, text-foreground, bg-card).',
    },
  },
  create(context) {
    function checkString(raw, node) {
      for (const token of raw.split(/\s+/)) {
        const violation = findViolation(token)
        if (violation) {
          context.report({ node, messageId: 'hardcodedColor', data: { token: violation } })
        }
      }
    }

    function checkExpression(node) {
      if (!node) return
      switch (node.type) {
        case 'Literal':
          if (typeof node.value === 'string') checkString(node.value, node)
          break
        case 'TemplateLiteral':
          for (const quasi of node.quasis) checkString(quasi.value.raw, node)
          break
        case 'ConditionalExpression':
          checkExpression(node.consequent)
          checkExpression(node.alternate)
          break
        case 'LogicalExpression':
          checkExpression(node.left)
          checkExpression(node.right)
          break
        case 'ArrayExpression':
          node.elements.forEach(checkExpression)
          break
        case 'ObjectExpression':
          for (const prop of node.properties) {
            if (prop.type === 'Property') checkExpression(prop.value)
          }
          break
        // CallExpression nodes (e.g. nested cn(...)) are left alone here — ESLint's
        // own traversal visits every CallExpression independently via the visitor
        // below, so recursing into them here would double-report.
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        const value = node.value
        if (!value) return
        if (value.type === 'JSXExpressionContainer') checkExpression(value.expression)
        else checkExpression(value)
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && CLASS_HELPER_NAMES.has(node.callee.name)) {
          node.arguments.forEach(checkExpression)
        }
      },
    }
  },
}
