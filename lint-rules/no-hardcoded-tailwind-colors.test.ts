import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noHardcodedTailwindColors } from './no-hardcoded-tailwind-colors.js'

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
const hardcoded = (token: string) => ({ messageId: 'hardcodedColor', data: { token } })

const HEX_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'fill',
  'stroke',
  'from',
  'via',
  'to',
  'outline',
  'decoration',
  'caret',
  'accent',
  'divide',
  'shadow',
]

ruleTester.run('no-hardcoded-tailwind-colors', noHardcodedTailwindColors, {
  valid: [
    // theme tokens
    { code: `<div className="bg-background text-foreground" />`, filename },
    // a shade of white is not the literal `bg-white`
    { code: `<div className="bg-white/50" />`, filename },
    // a named palette color is not caught by this rule
    { code: `<div className="bg-slate-50" />`, filename },
    // arbitrary non-hex value
    { code: `<div className="bg-[var(--card)]" />`, filename },
    // the same class in a non-className position
    { code: `<div data-variant="bg-white" />`, filename },
    // the same class in a string literal outside a class helper
    { code: `const label = 'bg-white'`, filename },
    // the same class passed to a function that is not a class helper
    { code: `track('bg-white')`, filename },
    // a hex-looking token under an unsupported prefix
    { code: `<div className="w-[#fff]" />`, filename },
  ],
  invalid: [
    // bg-white
    {
      code: `<div className="bg-white" />`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // text-black
    {
      code: `<div className="text-black" />`,
      filename,
      errors: [hardcoded('text-black')],
    },
    // hex value in every supported prefix
    ...HEX_PREFIXES.map((prefix) => ({
      code: `<div className="${prefix}-[#fff]" />`,
      filename,
      errors: [hardcoded(`${prefix}-[#fff]`)],
    })),
    // 6-digit hex
    {
      code: `<div className="bg-[#ffffff]" />`,
      filename,
      errors: [hardcoded('bg-[#ffffff]')],
    },
    // 8-digit hex (with alpha)
    {
      code: `<div className="bg-[#ffffff80]" />`,
      filename,
      errors: [hardcoded('bg-[#ffffff80]')],
    },
    // string in an expression container
    {
      code: `<div className={'bg-white'} />`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // template literal
    {
      code: `<div className={\`bg-white \${size}\`} />`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // conditional form
    {
      code: `<div className={active ? 'bg-white' : 'bg-background'} />`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // logical form
    {
      code: `<div className={active && 'text-black'} />`,
      filename,
      errors: [hardcoded('text-black')],
    },
    // array form inside a class helper
    {
      code: `cn(['bg-white', 'p-4'])`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // object form inside a class helper (the rule checks property values)
    {
      code: `cn({ base: 'p-4', active: 'text-black' })`,
      filename,
      errors: [hardcoded('text-black')],
    },
    // cn helper
    {
      code: `cn('bg-white')`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // clsx helper
    {
      code: `clsx('bg-white')`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // cva helper
    {
      code: `cva('bg-white')`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // classNames helper
    {
      code: `classNames('bg-white')`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // twMerge helper
    {
      code: `twMerge('bg-white')`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // a nested cn(...) reports once, not once per enclosing call
    {
      code: `<div className={cn('p-4', cn('bg-white'))} />`,
      filename,
      errors: [hardcoded('bg-white')],
    },
    // two tokens in one className report twice
    {
      code: `<div className="bg-white text-black" />`,
      filename,
      errors: [hardcoded('bg-white'), hardcoded('text-black')],
    },
  ],
})
