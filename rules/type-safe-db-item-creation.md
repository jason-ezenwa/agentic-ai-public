---
trigger: always_on
description: Enforces type-safe object creation pattern using Mongoose models
globs: **/*.service.ts, **/*.ts
---

# Type Safe Database Item Creation

## Rule
**NEVER** instantiate and save Mongoose models in a single line or pass a plain object to the constructor without explicit assignment.
**ALWAYS** instantiate the model first, assign properties individually, and then save or use `create`.

## Justification
- **Type Safety**: Assigning properties individually or to the instance allows TypeScript to catch missing or incorrect fields before the code runs.
- **Clarity**: Makes data transformation and assignment explicit, improving readability.
- **Validation**: Ensures that the object structure matches the schema definition before it hits the database layer.

## Examples

### BAD: Passing untyped object to constructor
```typescript
// WRONG: Missing type checking on the object literal
const user = new this.userModel({
  email: dto.email,
  name: dto.name,
  invalidField: 'someValue'
});
await user.save();
```

### BAD: Using create with object literal
```typescript
// WRONG: Type safety is weaker here
await this.userModel.create({
  email: dto.email,
  role: 'admin'
});
```

### GOOD: Explicit Instantiation and Assignment
```typescript
// RIGHT: Instantiate first
const user = new User();

// Assign properties (TypeScript validates these against the document interface)
user.email = dto.email;
user.name = dto.name;
user.role = UserRole.CUSTOMER;

// Save the instance
await this.userModel.create(user);
```