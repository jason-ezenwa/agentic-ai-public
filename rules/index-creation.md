---
description: Enforces database index creation via migrations instead of Mongoose decorators
globs: "**/*.schema.ts, **/*.js"
---
# Database Index Creation

## Rule
**NEVER** define database indexes using `@nestjs/mongoose` decorators or inside the schema definition.
**ALWAYS** create and manage indexes using database migration scripts.

### Forbidden Patterns in Schema Files
- `@Prop({ index: true })`
- `@Prop({ unique: true })`
- `MySchema.index({ field: 1 })`

## Justification
- **Control**: Migrations provide granular control over when and how indexes are built, avoiding performance hits during application startup.
- **Consistency**: Ensures the database state is strictly versioned and consistent across all environments.
- **Safety**: Prevents accidental index creation or rebuilding in production environments which can lock collections.

## Examples

### BAD: Defining Index in Schema
```typescript
// src/app/user/schemas/user.schema.ts
@Schema()
export class User {
  @Prop({ required: true, index: true }) // WRONG: Do not use index: true here
  email: string;
}

// OR
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true }); // WRONG: Do not define indexes here
```

### GOOD: Defining Index in Migration
Create a new migration file (e.g., `migrations/20251101143012-add-indexes-to-user.js`) using your migration tool.

```javascript
// migrations/20251101143012-add-indexes-to-user.js
module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // RIGHT: Create indexes explicitly in the migration
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('students').createIndex({ userId: 1 });
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback logic
    await db.collection('users').dropIndex('email_1');
    await db.collection('students').dropIndex('userId_1');
  }
};
```