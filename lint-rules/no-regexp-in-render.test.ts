import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noRegexpInRender } from './no-regexp-in-render.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const filename = 'component.tsx'
const regexpInRender = { messageId: 'regexpInRender' }

ruleTester.run('no-regexp-in-render', noRegexpInRender, {
  valid: [
    // a regex at module scope is compiled once
    { code: `const EMAIL = /^[^@]+@[^@]+$/\nfunction Field() { return <input /> }`, filename },
    // a RegExp constructed at module scope
    { code: `const EMAIL = new RegExp('^[^@]+@[^@]+$')\nfunction Field() { return <input /> }`, filename },
    // a regex built in useMemo inside a component
    {
      code: `function Highlighter({ query }) {\n  const regex = useMemo(() => new RegExp(query, 'gi'), [query])\n  return <span>{regex.source}</span>\n}`,
      filename,
    },
    // a regex literal in useMemo inside a component
    {
      code: `function Field() {\n  const regex = useMemo(() => /^[^@]+@[^@]+$/, [])\n  return <input data-p={regex.source} />\n}`,
      filename,
    },
    // useMemo reached through the React namespace
    {
      code: `function Field() {\n  const regex = React.useMemo(() => /a+/, [])\n  return <input data-p={regex.source} />\n}`,
      filename,
    },
    // a regex used inside a useMemo callback's own nested callback
    {
      code: `function List({ items }) {\n  const parts = useMemo(() => items.map((item) => item.split(/,\\s*/)), [items])\n  return <ul>{parts.length}</ul>\n}`,
      filename,
    },
    // a regex in a non-component function
    { code: `function normalizePath(value) { return value.replace(/\\/+$/, '') }`, filename },
    // a non-component lowercase arrow function
    { code: `const normalize = (value) => value.replace(/\\s+/g, ' ')`, filename },
    // a function whose name is not a hook despite starting with "use"
    { code: `function username(value) { return value.replace(/\\s/g, '') }`, filename },
    // a class component is a documented limit: its render method is not checked
    {
      code: `class Field extends React.Component {\n  render() {\n    return <input data-ok={/^a+$/.test(this.props.value)} />\n  }\n}`,
      filename,
    },
    // the identifier RegExp used as a type position only, not constructed
    { code: `function Field({ pattern }: { pattern: RegExp }) { return <input /> }`, filename },
  ],
  invalid: [
    // a regex literal in a PascalCase function declaration
    {
      code: `function Field({ value }) {\n  const ok = /^[^@]+@[^@]+$/.test(value)\n  return <input data-ok={ok} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex literal in a PascalCase arrow function
    {
      code: `const Field = ({ value }) => {\n  const ok = /^a+$/.test(value)\n  return <input data-ok={ok} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex literal in a PascalCase function expression
    {
      code: `const Field = function ({ value }) {\n  return <input data-ok={/^a+$/.test(value)} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a named function expression assigned to a PascalCase identifier
    {
      code: `const Field = function Inner({ value }) {\n  return <input data-ok={/^a+$/.test(value)} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // assignment form rather than a declaration
    {
      code: `let Field\nField = ({ value }) => /^a+$/.test(value)`,
      filename,
      errors: [regexpInRender],
    },
    // new RegExp inside a component
    {
      code: `function Highlighter({ query }) {\n  const regex = new RegExp(query, 'gi')\n  return <span>{regex.source}</span>\n}`,
      filename,
      errors: [regexpInRender],
    },
    // RegExp called without new inside a component
    {
      code: `function Highlighter({ query }) {\n  const regex = RegExp(query, 'gi')\n  return <span>{regex.source}</span>\n}`,
      filename,
      errors: [regexpInRender],
    },
    // window.RegExp inside a component
    {
      code: `function Highlighter({ query }) {\n  const regex = new window.RegExp(query, 'gi')\n  return <span>{regex.source}</span>\n}`,
      filename,
      errors: [regexpInRender],
    },
    // globalThis.RegExp called without new inside a component
    {
      code: `function Highlighter({ query }) {\n  const regex = globalThis.RegExp(query, 'gi')\n  return <span>{regex.source}</span>\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex inside a custom hook body
    {
      code: `function useSlug(value) {\n  return value.replace(/[^a-z]+/g, '-')\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex inside an event handler nested in a component
    {
      code: `function Field() {\n  const onChange = (event) => /^a+$/.test(event.target.value)\n  return <input onChange={onChange} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex inside a .map callback nested in a component
    {
      code: `function List({ items }) {\n  return <ul>{items.map((item) => <li key={item}>{item.replace(/_/g, ' ')}</li>)}</ul>\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex inside an inline JSX handler
    {
      code: `function Field() {\n  return <input onChange={(event) => /^a+$/.test(event.target.value)} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex outside the useMemo callback but inside the component
    {
      code: `function Field({ query }) {\n  const escaped = query.replace(/[.*+]/g, '\\\\$&')\n  const regex = useMemo(() => new RegExp(escaped), [escaped])\n  return <input data-p={regex.source} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // a regex in a useMemo dependency position, not the callback
    {
      code: `function Field({ query }) {\n  const regex = useMemo(fn, [/^a+$/])\n  return <input data-p={regex} />\n}`,
      filename,
      errors: [regexpInRender],
    },
    // two regexes in one component report twice
    {
      code: `function Field({ value }) {\n  const a = /^a+$/.test(value)\n  const b = new RegExp('b+').test(value)\n  return <input data-a={a} data-b={b} />\n}`,
      filename,
      errors: [regexpInRender, regexpInRender],
    },
    // reported location points at the regex itself
    {
      code: `function Field({ value }) {\n  const ok = /^a+$/.test(value)\n  return <input data-ok={ok} />\n}`,
      filename,
      errors: [{ messageId: 'regexpInRender', line: 2, column: 14, endLine: 2, endColumn: 20 }],
    },
  ],
})
