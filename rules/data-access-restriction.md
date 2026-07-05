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

### 2. Cross-Module Data Access Pattern
When a service needs to interact with data from another module:
- **ALWAYS** inject and use the appropriate service from that module
- **NEVER** directly inject or manipulate foreign models
- If the required service method doesn't exist, create it in the owning module first

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
- `user/` module: owns `User` model - only `UserService` should inject `User` model
- `student/` module: owns `Student` model - only `StudentService` should inject `Student` model
- `onboarding/` module: should not inject any models directly, only use other services

### 5. Service Method Creation
If you need a specific operation that doesn't exist in the target service:
1. Create the method in the appropriate service (e.g., `UserService.findById()`)
2. Export the service from its module
3. Import and use the service in your module

### 6. File Patterns to Watch
- Any `@InjectModel()` outside of the model's home module
- Any schema imports like `import { User } from '../user/user.schema'` in non-user services
- Direct model manipulation in services that don't own the model

### 7. Enforcement
- Services should only import and inject models from their own module directory
- Cross-module dependencies should be service-to-service only
- Each model should have exactly one service that manages its direct database operations