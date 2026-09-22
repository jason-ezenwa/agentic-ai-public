// Flags the JSX `style` attribute. An inline style bypasses Tailwind and the
// theme tokens, so it does not respond to a theme change and does not show up
// when someone greps the class for a utility. Every form is reported — an
// object literal, a variable, a call, a `style` key inside a spread object
// literal — because the value is not what makes it a problem; being outside
// the class system is. A spread of an identifier (`{...props}`) cannot be
// resolved statically, so it is left alone; likewise a computed key inside a
// spread literal, unless it is the string literal `['style']`.
//
// There is no allowance here for the case that genuinely needs a computed
// value. That case is meant to surface in review rather than be waved through
// by the rule.

export const noInlineStyles = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the JSX style attribute in favor of Tailwind utility classes and theme tokens.',
    },
    schema: [],
    messages: {
      inlineStyle:
        'The `style` attribute bypasses Tailwind and the theme tokens. Express this as a className.',
    },
  },
  create(context) {
    // `style`, `'style'` and `['style']` all name the key statically; any
    // other computed key does not.
    function staticKeyName(prop) {
      if (prop.key.type === 'Literal') return prop.key.value
      if (prop.key.type === 'Identifier' && !prop.computed) return prop.key.name
      return null
    }

    // Walks an object literal for a `style` key, following nested object
    // literal spreads (`{ ...{ style } }`) since those are just as static.
    function reportStyleKeys(objectNode) {
      for (const prop of objectNode.properties) {
        if (prop.type === 'SpreadElement') {
          if (prop.argument.type === 'ObjectExpression') reportStyleKeys(prop.argument)
          continue
        }
        if (prop.type !== 'Property') continue
        if (staticKeyName(prop) === 'style') context.report({ node: prop, messageId: 'inlineStyle' })
      }
    }

    return {
      JSXSpreadAttribute(node) {
        if (node.argument.type === 'ObjectExpression') reportStyleKeys(node.argument)
      },
      JSXAttribute(node) {
        // JSXNamespacedName (`xlink:href`-style) has no `name` string, so the
        // identifier check also filters those out.
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
        context.report({ node, messageId: 'inlineStyle' })
      },
    }
  },
}
