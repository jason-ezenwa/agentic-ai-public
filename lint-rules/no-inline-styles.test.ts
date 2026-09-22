import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noInlineStyles } from './no-inline-styles.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const filename = 'component.tsx'
const inlineStyle = { messageId: 'inlineStyle' }

ruleTester.run('no-inline-styles', noInlineStyles, {
  valid: [
    // className is the sanctioned way
    { code: `<div className="p-4" />`, filename },
    // a variable named `style` passed to className
    { code: `const style = 'p-4'; const el = <div className={style} />`, filename },
    // a prop whose name merely contains "style"
    { code: `<Card styleVariant="outlined" />`, filename },
    { code: `<Card headingStyle="bold" />`, filename },
    // a spread object literal with no style key
    { code: `<div {...{ className: 'p-4' }} />`, filename },
    // a computed key that is not a string literal cannot be resolved statically
    { code: `<div {...{ [key]: s }} />`, filename },
    // a spread of an identifier cannot be resolved statically
    { code: `<div {...props} />`, filename },
    // the <style> element is not the style attribute
    { code: `<style>{css}</style>`, filename },
    // a namespaced attribute has no plain name and must not throw
    { code: `<svg xlink:href="#icon" />`, filename },
  ],
  invalid: [
    // object literal
    {
      code: `<div style={{ color: 'red' }} />`,
      filename,
      errors: [inlineStyle],
    },
    // a variable
    {
      code: `<div style={styles} />`,
      filename,
      errors: [inlineStyle],
    },
    // a member expression
    {
      code: `<div style={theme.card} />`,
      filename,
      errors: [inlineStyle],
    },
    // a call
    {
      code: `<div style={getStyle(active)} />`,
      filename,
      errors: [inlineStyle],
    },
    // on a component rather than a DOM element
    {
      code: `<Card style={{ color: 'red' }} />`,
      filename,
      errors: [inlineStyle],
    },
    // style passed through a spread object literal
    {
      code: `<div {...{ style: s }} />`,
      filename,
      errors: [inlineStyle],
    },
    // shorthand style key in a spread object literal
    {
      code: `<div {...{ style }} />`,
      filename,
      errors: [inlineStyle],
    },
    // style as a string key in a spread object literal
    {
      code: `<div {...{ 'style': s }} />`,
      filename,
      errors: [inlineStyle],
    },
    // computed string-literal style key in a spread object literal
    {
      code: `<div {...{ ['style']: s }} />`,
      filename,
      errors: [inlineStyle],
    },
    // style inside a nested spread within the spread object literal
    {
      code: `<div {...{ ...{ style: s } }} />`,
      filename,
      errors: [inlineStyle],
    },
    // the report points at the style property, not the whole spread
    {
      code: `<div {...{ id, style: s }} />`,
      filename,
      errors: [{ messageId: 'inlineStyle', line: 1, column: 16, endLine: 1, endColumn: 24 }],
    },
    // two elements in one tree report twice
    {
      code: `<div style={{ a: 1 }}><span style={{ b: 2 }} /></div>`,
      filename,
      errors: [inlineStyle, inlineStyle],
    },
  ],
})
