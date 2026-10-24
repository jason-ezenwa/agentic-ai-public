import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noCrossModuleModelAccess } from './no-cross-module-model-access.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

// Module folders in the fixture: src (app.module.ts), src/user, src/onboarding,
// src/billing, and src/billing/invoices nested inside billing.
const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/no-cross-module-model-access/src',
)
const at = (file: string) => path.join(fixture, file)

const crossModule = (name: string, owner: string) => ({
  messageId: 'crossModuleModelAccess',
  data: { name, owner },
})

ruleTester.run('no-cross-module-model-access', noCrossModuleModelAccess, {
  valid: [
    // the owning module injects its own model
    {
      filename: at('user/user.service.ts'),
      code: `import { User } from './user.schema'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
    },
    // a sub-folder with no module file of its own belongs to the module above it
    {
      filename: at('user/profile/profile.service.ts'),
      code: `import { User } from '../user.schema'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
    },
    // the owning module registers its own schema
    {
      filename: at('user/user.module.ts'),
      code: `import { User, UserSchema } from './user.schema'\nMongooseModule.forFeature([{ name: User.name, schema: UserSchema }])`,
    },
    // two services in one module share its models
    {
      filename: at('billing/billing-export.service.ts'),
      code: `import { Invoice } from './schemas/invoice.schema'\nclass S { constructor(@InjectModel(Invoice.name) private m: Model<InvoiceDocument>) {} }`,
    },
    // another module's service, not its model
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { UserService } from '../user/user.service'\nclass S { constructor(private users: UserService) {} }`,
    },
    // a type-only import
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import type { UserDocument } from '../user/user.schema'\nlet u: UserDocument`,
    },
    // an inline type specifier
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { type UserDocument } from '../user/user.schema'\nlet u: UserDocument`,
    },
    // a schema class used only as a type, without import type
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema'\nfunction f(u: User) { return u }`,
    },
    // an enum from another module's schema file, used at runtime in a DTO
    {
      filename: at('onboarding/dto/update-status.dto.ts'),
      code: `import { UserStatus } from '../../user/user.schema'\nclass D { @IsEnum(UserStatus) status }`,
    },
    // a non-schema file from another module
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.entity'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
    },
    // a package import, not a relative one
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '@org/user/user.schema'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
    },
    // an InjectModel argument that is not the imported name
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema'\nclass S { constructor(@InjectModel(Lead.name) private m: Model<LeadDocument>) {} }`,
    },
  ],
  invalid: [
    // the textbook case: InjectModel with another module's schema class
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
      errors: [crossModule('User', 'user')],
    },
    // InjectModel with the bare class instead of .name
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema'\nclass S { constructor(@InjectModel(User) private m: Model<UserDocument>) {} }`,
      errors: [crossModule('User', 'user')],
    },
    // an aliased import
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User as Account } from '../user/user.schema'\nclass S { constructor(@InjectModel(Account.name) private m: Model<UserDocument>) {} }`,
      errors: [crossModule('Account', 'user')],
    },
    // a schema import written with its extension
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema.ts'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
      errors: [crossModule('User', 'user')],
    },
    // a decorated class property instead of a constructor parameter
    {
      filename: at('onboarding/onboarding.service.ts'),
      code: `import { User } from '../user/user.schema'\nclass S { @InjectModel(User.name) private m: Model<UserDocument> }`,
      errors: [crossModule('User', 'user')],
    },
    // forFeature registering another module's schema: one report per entry
    {
      filename: at('onboarding/onboarding.module.ts'),
      code: `import { User, UserSchema } from '../user/user.schema'\n@Module({ imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])] })\nclass M {}`,
      errors: [crossModule('User', 'user')],
    },
    // forFeature mixing an own schema and a foreign one reports only the foreign entry
    {
      filename: at('billing/billing.module.ts'),
      code: `import { Invoice, InvoiceSchema } from './schemas/invoice.schema'\nimport { User, UserSchema } from '../user/user.schema'\nMongooseModule.forFeature([\n  { name: Invoice.name, schema: InvoiceSchema },\n  { name: User.name, schema: UserSchema },\n])`,
      errors: [{ ...crossModule('User', 'user'), line: 5 }],
    },
    // forFeatureAsync
    {
      filename: at('onboarding/onboarding.module.ts'),
      code: `import { User, UserSchema } from '../user/user.schema'\nMongooseModule.forFeatureAsync([{ name: User.name, useFactory: () => UserSchema }])`,
      errors: [crossModule('User', 'user')],
    },
    // a nested folder with its own module file is a separate module
    {
      filename: at('billing/invoices/invoices.service.ts'),
      code: `import { Invoice } from '../schemas/invoice.schema'\nclass S { constructor(@InjectModel(Invoice.name) private m: Model<InvoiceDocument>) {} }`,
      errors: [crossModule('Invoice', 'billing')],
    },
    // the parent module reaching into a nested module's schema
    {
      filename: at('billing/billing.service.ts'),
      code: `import { LineItem } from './invoices/line-item.schema'\nclass S { constructor(@InjectModel(LineItem.name) private m: Model<LineItemDocument>) {} }`,
      errors: [crossModule('LineItem', 'invoices')],
    },
    // a file outside any feature module belongs to the root app module
    {
      filename: at('shared/audit.service.ts'),
      code: `import { User } from '../user/user.schema'\nclass S { constructor(@InjectModel(User.name) private m: Model<UserDocument>) {} }`,
      errors: [crossModule('User', 'user')],
    },
  ],
})
