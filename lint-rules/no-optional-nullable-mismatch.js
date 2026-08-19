// Flags TypeScript members that are both optional (`foo?:`) and nullable
// (`foo: T | null`). A field should signal absence one way, not two:
// either optional (absent -> undefined) or nullable (always present, may be
// explicitly null) — not both at once.

function typeIsUnionAndIncludesNull(typeNode) {
  if (!typeNode) return false
  if (typeNode.type === 'TSUnionType') {
    return typeNode.types.some((member) => member.type === 'TSNullKeyword')
  }
  return false
}

function memberName(key) {
  if (!key) return '<computed>'
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal') return String(key.value)
  return '<computed>'
}

function checkMember(node, context) {
  if (!node.optional) return
  const typeNode = node.typeAnnotation && node.typeAnnotation.typeAnnotation
  if (!typeIsUnionAndIncludesNull(typeNode)) return
  context.report({
    node,
    messageId: 'optionalNullableMismatch',
    data: { name: memberName(node.key) },
  })
}

export const noOptionalNullableMismatch = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow properties that are both optional (?:) and nullable (T | null). Pick one: optional for "may be absent" (undefined), or nullable for "always present, may be null".',
    },
    schema: [],
    messages: {
      optionalNullableMismatch:
        'Property "{{name}}" is optional and nullable at the same time. Use either `{{name}}?: T` (absent -> undefined) or `{{name}}: T | null` (always present, explicitly null) — not both.',
    },
  },
  create(context) {
    return {
      TSPropertySignature(node) {
        checkMember(node, context)
      },
      PropertyDefinition(node) {
        checkMember(node, context)
      },
    }
  },
}
