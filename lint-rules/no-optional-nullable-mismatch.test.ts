import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noOptionalNullableMismatch } from './no-optional-nullable-mismatch.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

const mismatch = (name: string) => ({
  messageId: 'optionalNullableMismatch',
  data: { name },
})

ruleTester.run('no-optional-nullable-mismatch', noOptionalNullableMismatch, {
  valid: [
    // optional alone
    `interface A { foo?: string }`,
    // nullable alone
    `interface A { foo: string | null }`,
    // optional with undefined is still one signal (absent -> undefined)
    `interface A { foo?: string | undefined }`,
    // required union without null
    `interface A { foo: string | number }`,
    // type literal, optional alone
    `type A = { foo?: string }`,
    // type literal, nullable alone
    `type A = { foo: string | null }`,
    // class field, optional alone
    `class A { foo?: string }`,
    // class field, nullable alone
    `class A { foo: string | null = null }`,
    // a nullable type nested inside a generic is not a top-level union with null
    `interface A { foo?: Array<string | null> }`,
  ],
  invalid: [
    // interface member, T | null
    {
      code: `interface A { foo?: string | null }`,
      errors: [mismatch('foo')],
    },
    // interface member, T | null | undefined
    {
      code: `interface A { foo?: string | null | undefined }`,
      errors: [mismatch('foo')],
    },
    // type-literal member, T | null
    {
      code: `type A = { foo?: string | null }`,
      errors: [mismatch('foo')],
    },
    // type-literal member, T | null | undefined
    {
      code: `type A = { foo?: string | null | undefined }`,
      errors: [mismatch('foo')],
    },
    // class field, T | null
    {
      code: `class A { foo?: string | null }`,
      errors: [mismatch('foo')],
    },
    // class field, T | null | undefined
    {
      code: `class A { foo?: string | null | undefined }`,
      errors: [mismatch('foo')],
    },
    // null anywhere in the union, not only at the end
    {
      code: `interface A { foo?: null | string }`,
      errors: [mismatch('foo')],
    },
    // string-literal key is named in the message
    {
      code: `interface A { 'foo-bar'?: string | null }`,
      errors: [mismatch('foo-bar')],
    },
    // two members report twice
    {
      code: `interface A { foo?: string | null; bar?: number | null }`,
      errors: [mismatch('foo'), mismatch('bar')],
    },
  ],
})
