---
alwaysApply: true
trigger: always_on
---

# Module Separation and Data Access Rules

## Core Principle
Services should only directly access models that belong to their own module. Cross-module data access must go through the appropriate service layer to maintain separation of concerns and encapsulation.

## Rules

### 1. Model Access Restriction
- **NEVER** use `@InjectModel()` for models that don't belong to the current module
- **NEVER** import schemas from other modules in service files
- Each module's service is the **ONLY** place that should directly interact with its own model

### 2. Types Are Allowed
The restriction is on **database operations**, not on types. Using another module's types (document types like `StudentDocument`, DTOs, interfaces, enums) is fine — you need them to type what its service returns.
- **ALLOWED**: `import type { StudentDocument } from '../student/student.schema'` in any module, when used purely as a type
- **NOT ALLOWED**: using an imported schema class at runtime — `@InjectModel()`, model construction, or any query/write against a collection the module doesn't own
- Prefer `import type` for these imports so the compile-time-only intent is explicit and distinguishable from a real schema import

### 3. Examples

#### ❌ BAD - Direct model access across modules
```typescript
// onboarding.service.ts - WRONG
@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>, // ❌ accessing User model directly
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>, // ❌ accessing Student model directly
  ) {}
}
```

#### ✅ GOOD - Service-to-service communication
```typescript
// onboarding.service.ts - CORRECT
@Injectable()
export class OnboardingService {
  constructor(
    private userService: UserService, // ✅ use UserService for user operations
    private studentService: StudentService, // ✅ use StudentService for student operations
  ) {}
}
```

### 4. Module Ownership
- `user/` module: owns `User` model/schema - only `UserService` should inject `User` model
- `student/` module: owns `Student` model/schema - only `StudentService` should inject `Student` model
- `onboarding/` module: should not inject any models directly, only use other services

### 5. Service Method Creation
If you need a specific operation that doesn't exist in the target service:
1. Create the method in the appropriate service (e.g., `UserService.findById()`)
2. Export the service from its module
3. Import and use the service in your module
