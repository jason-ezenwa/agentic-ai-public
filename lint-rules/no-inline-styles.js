// Flags the JSX `style` attribute. An inline style bypasses Tailwind and the
// theme tokens, so it does not respond to a theme change and does not show up
// when someone greps the class for a utility. Every form is reported — an
// object literal, a variable, a call, a spread — because the value is not what
// makes it a problem; being outside the class system is.
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
    return {
      JSXAttribute(node) {
        // JSXNamespacedName (`xlink:href`-style) has no `name` string, so the
        // identifier check also filters those out.
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
        context.report({ node, messageId: 'inlineStyle' })
      },
    }
  },
}
