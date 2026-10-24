// Enforces the type-safe-db-item-creation rule: an object literal handed to a
// Mongoose model (`new Model({...})`, `.create({...})`, `.insertMany([{...}])`)
// is not checked against the document type, so a missing or misspelled field
// reaches the database. Build a typed instance and assign its fields instead.
// Mongoose / @nestjs/mongoose specific — a Prisma project does not install it.
// A model is recognised by convention: a `*Model` identifier, or a class field
// injected with `@InjectModel` or typed `Model<...>` / `PaginateModel<...>`.

const MODEL_SUFFIX = /Model$/
const MODEL_TYPES = new Set(['Model', 'PaginateModel'])
const DOCUMENT_METHODS = new Set(['create', 'insertMany'])

function hasInjectModel(decorators) {
  return (decorators ?? []).some((decorator) => {
    const expression = decorator.expression
    return (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'InjectModel'
    )
  })
}

function hasModelType(typeAnnotation) {
  const type = typeAnnotation?.typeAnnotation
  if (!type || type.type !== 'TSTypeReference') return false
  const name = type.typeName
  return name.type === 'Identifier' && MODEL_TYPES.has(name.name)
}

function staticName(key) {
  if (!key) return null
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value
  return null
}

// Names of the fields on this class that hold a model, from `@InjectModel` or
// a `Model<...>` annotation on a class property or constructor parameter property.
function collectModelFields(classNode) {
  const fields = new Set()
  for (const member of classNode.body.body) {
    if (member.type === 'PropertyDefinition' && !member.computed) {
      const name = staticName(member.key)
      if (name && (hasInjectModel(member.decorators) || hasModelType(member.typeAnnotation))) {
        fields.add(name)
      }
    }
    if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
      for (const param of member.value.params) {
        if (param.type !== 'TSParameterProperty') continue
        const inner =
          param.parameter.type === 'AssignmentPattern' ? param.parameter.left : param.parameter
        if (inner.type !== 'Identifier') continue
        const decorators = [...(param.decorators ?? []), ...(inner.decorators ?? [])]
        if (hasInjectModel(decorators) || hasModelType(inner.typeAnnotation)) {
          fields.add(inner.name)
        }
      }
    }
  }
  return fields
}

export const noUntypedMongooseCreate = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow object literals passed straight to a Mongoose model constructor, create or insertMany.',
    },
    schema: [],
    messages: {
      untypedMongooseCreate:
        'Object literal passed to a Mongoose model. Build a typed instance first and assign its fields, so missing or unknown fields fail at compile time.',
    },
  },
  create(context) {
    const scopeStack = []

    function isModel(node) {
      if (node.type === 'Identifier') return MODEL_SUFFIX.test(node.name)
      if (node.type !== 'MemberExpression' || node.computed) return false
      if (node.object.type !== 'ThisExpression') return false
      const name = staticName(node.property)
      const fields = scopeStack[scopeStack.length - 1]
      return Boolean(name && fields && fields.has(name))
    }

    function reportObjectLiterals(nodes) {
      for (const node of nodes) {
        if (node && node.type === 'ObjectExpression') {
          context.report({ node, messageId: 'untypedMongooseCreate' })
        }
      }
    }

    function enterClass(node) {
      scopeStack.push(collectModelFields(node))
    }

    // A non-arrow function rebinds `this`, so the class fields no longer apply;
    // a class method's own function is the exception.
    function rebindsThis(node) {
      return node.parent?.type !== 'MethodDefinition'
    }

    function enterFunction(node) {
      if (rebindsThis(node)) scopeStack.push(new Set())
    }

    function exitFunction(node) {
      if (rebindsThis(node)) scopeStack.pop()
    }

    function exitScope() {
      scopeStack.pop()
    }

    return {
      ClassDeclaration: enterClass,
      ClassExpression: enterClass,
      'ClassDeclaration:exit': exitScope,
      'ClassExpression:exit': exitScope,
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      'FunctionExpression:exit': exitFunction,
      NewExpression(node) {
        if (!isModel(node.callee)) return
        reportObjectLiterals([node.arguments[0]])
      },
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        const method = staticName(callee.property)
        if (!DOCUMENT_METHODS.has(method)) return
        if (!isModel(callee.object)) return
        const first = node.arguments[0]
        if (!first) return
        // An array, or a first argument that is not a literal, is followed by
        // options; `create` with a literal first is the variadic form.
        if (first.type === 'ArrayExpression') reportObjectLiterals(first.elements)
        else if (method === 'create' && first.type === 'ObjectExpression') {
          reportObjectLiterals(node.arguments)
        } else reportObjectLiterals([first])
      },
    }
  },
}
