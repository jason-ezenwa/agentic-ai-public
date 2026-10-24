import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import { noUntypedMongooseCreate } from './no-untyped-mongoose-create.js'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const untyped = { messageId: 'untypedMongooseCreate' }

ruleTester.run('no-untyped-mongoose-create', noUntypedMongooseCreate, {
  valid: [
    // the prescribed pattern: typed instance, fields assigned, then create
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  async run(dto) {\n    const user = new User()\n    user.email = dto.email\n    await this.userModel.create(user)\n  }\n}`,
    // non-literal arguments
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(dto) { return this.userModel.create(dto) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(doc) { return new this.userModel(doc) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(docs) { return this.userModel.insertMany(docs) }\n}`,
    // options arguments are not documents
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(user, session) { return this.userModel.create(user, { session }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(user, session) { return this.userModel.create([user], { session }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(docs) { return this.userModel.insertMany(docs, { ordered: false }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(user, session) { return this.userModel.insertMany([user], { session }) }\n}`,
    // a schema class, not a model
    `const user = new User()`,
    `const user = new User({ email: 'a@b.c' })`,
    // a *Model-named field with no class hook is not a model
    `class S { run(prompt) { return this.aiModel.create({ prompt }) } }`,
    `class S { run() { return this.userModel.create({ a: 1 }) } }`,
    // a lowercase `model` suffix is not the convention
    `datamodel.create({ a: 1 })`,
    // a service with no injection, no Model type
    `class S {\n  constructor(private readonly users: SomeService) {}\n  run() { return this.users.create({ a: 1 }) }\n}`,
    // a different param is injected; the un-injected one is not a model
    `class S {\n  constructor(\n    @InjectModel(User.name) private readonly models: Model<UserDocument>,\n    private readonly users: SomeService,\n  ) {}\n  run() { return this.users.create({ a: 1 }) }\n}`,
    // a TypeORM-style repository
    `class S {\n  constructor(private readonly repo: Repository<User>) {}\n  run() { return this.repo.create({ a: 1 }) }\n}`,
    // queries take filters, not documents
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(email) { return this.userModel.find({ email }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return this.userModel.findOne({ a: 1 }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return this.userModel.updateOne({ a: 1 }, { b: 2 }) }\n}`,
    `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return this.userModel.deleteMany({ a: 1 }) }\n}`,
    // nested class: the inner class has no injection of its own
    `class Outer {\n  constructor(@InjectModel(User.name) private store: Model<UserDocument>) {}\n  build() {\n    return class Inner {\n      constructor(private store: Cache) {}\n      run() { return this.store.create({ a: 1 }) }\n    }\n  }\n}`,
    // a non-arrow function rebinds `this`
    `class S {\n  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {}\n  run() {\n    return [1].map(function () { return this.users.create({ a: 1 }) })\n  }\n}`,
  ],
  invalid: [
    // new on an injected field
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(dto) { return new this.userModel({ email: dto.email }) }\n}`,
      errors: [untyped],
    },
    // create with an object literal
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  async run(dto) { await this.userModel.create({ email: dto.email, role: 'admin' }) }\n}`,
      errors: [untyped],
    },
    // variadic create reports each document
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return this.userModel.create({ a: 1 }, { b: 2 }) }\n}`,
      errors: [untyped, untyped],
    },
    // create with an array of documents
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return this.userModel.create([{ a: 1 }]) }\n}`,
      errors: [untyped],
    },
    // create with an array and options reports the document only
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(session) { return this.userModel.create([{ a: 1 }], { session }) }\n}`,
      errors: [untyped],
    },
    // insertMany with a literal element and a non-literal element
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run(docs) { return this.userModel.insertMany([{ a: 1 }, docs[0]]) }\n}`,
      errors: [untyped],
    },
    // bare identifier with the suffix
    {
      code: `const user = new UserModel({ email: 'a@b.c' })`,
      errors: [untyped],
    },
    {
      code: `UserModel.create({ email: 'a@b.c' })`,
      errors: [untyped],
    },
    // @InjectModel constructor param with a neutral name
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {}\n  run() { return this.users.create({ a: 1 }) }\n}`,
      errors: [untyped],
    },
    // Model<...> type annotation alone
    {
      code: `class S {\n  constructor(private readonly users: Model<UserDocument>) {}\n  run() { return new this.users({ a: 1 }) }\n}`,
      errors: [untyped],
    },
    // PaginateModel<...> type annotation
    {
      code: `class S {\n  constructor(private readonly users: PaginateModel<User>) {}\n  run() { return this.users.create({ a: 1 }) }\n}`,
      errors: [untyped],
    },
    // @InjectModel on a class property declaration
    {
      code: `class S {\n  @InjectModel(User.name) private x\n  run() { return this.x.create({ a: 1 }) }\n}`,
      errors: [untyped],
    },
    // a class expression
    {
      code: `const Svc = class {\n  constructor(private users: Model<UserDocument>) {}\n  run() { return this.users.create({ a: 1 }) }\n}`,
      errors: [untyped],
    },
    // an arrow function keeps the class `this`
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {}\n  run() { return [1].map(() => this.users.create({ a: 1 })) }\n}`,
      errors: [untyped],
    },
    // new ... .save() reports once, at the new
    {
      code: `class S {\n  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}\n  run() { return new this.userModel({ a: 1 }).save() }\n}`,
      errors: [untyped],
    },
  ],
})
