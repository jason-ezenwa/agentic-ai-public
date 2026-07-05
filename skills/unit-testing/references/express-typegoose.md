# Unit Testing — Express + Typegoose

Write behavioural unit tests for service methods using **Jest**, **`@golevelup/ts-jest`** (`createMock<T>()`), and **tsyringe** DI.

## Setup Template

```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';
import { createMock } from '@golevelup/ts-jest';
import { ServiceName } from './service-name.service';
import { Dep1Service } from '../dep1';
import { ModelName } from './models/model-name.model';

// DO NOT jest.mock() models at module level — use jest.spyOn in individual tests

describe('ServiceName', () => {
  let service: ServiceName;
  let dep1: jest.Mocked<Dep1Service>;

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();

    dep1 = createMock<Dep1Service>();

    // Instantiate directly — do NOT use container.resolve
    service = new ServiceName(dep1);

    // Logger is a read-only property; override via bracket notation
    service['logger'] = mockLogger;
  });

  describe('methodName', () => {
    // Tests go here
  });
});
```

## Test Organization

Nest tests under `describe('methodName', () => { ... })` with three sub-groups:

### 1. Happy Paths
All successful execution paths: primary flow, alternative valid flows, edge cases that succeed.

### 2. Error Cases
All failure scenarios: missing/invalid inputs, not-found, validation failures, permission errors, dependency failures, error propagation.

### 3. Logging
Verify meaningful log events at key outcomes: `mockLogger.info` on success and `mockLogger.error` on failure, both with proper context objects.

Only assert on logs that confirm a significant outcome (e.g., "order created", "payment failed"). Do not assert on trace/debug logs for intermediate steps within a method — these are implementation noise, not observable behaviour.

## Test Names

Name tests as observable outcomes — what the method does, not how it does it.

```
// GOOD — outcome-focused
it('returns the created order with status PENDING')
it('throws when customer does not exist')
it('returns null when user is not found')

// BAD — implementation-focused
it('calls dep.findByUserId with userId')
it('should handle tag validation')
it('should successfully assign when conditions met')
```

## Mocking Patterns

### Typed mock data — prefer `mockOfType` over `as any`

Build mock **data** with `mockOfType<T>` / `mockOfTypeList<T>` instead of `as any`, so the fields you supply are type-checked against the real type. See [mock-of-type.md](mock-of-type.md) for the helper and the full decision table. In short:

- **Arguments**, **dependency return values**, and `.lean()` results → `mockOfType<T>(...)`.
- **Typegoose model document resolves** (`findById`/`findOne`/`create`/… `.mockResolvedValue(doc)`) → keep `as any`; the hydrated `DocumentType<T>` no nameable `T` can satisfy (see the reference's Limitations).

If the project has no such helper yet, create it per the reference, then import it:

```typescript
import { mockOfType, mockOfTypeList } from '../test-utils/mock-of-type';
```

### Dependency methods (async)
`createMock<T>()` produces a fully typed `jest.Mocked<T>` — no `jest.spyOn` needed for dependencies. Wrap success data in `mockOfType<T>` so it stays checked against the return type:
```typescript
dep.method.mockResolvedValue(mockOfType<DepResult>(data)); // success
dep.method.mockResolvedValue(null);                        // not found
dep.method.mockRejectedValue(new Error('msg'));            // failure
```

### Typegoose models — always `jest.spyOn`, never `jest.mock`
Models are static classes in typegoose — spy directly on the class.

> Document resolves keep `as any` — Typegoose types the resolved value as a hydrated `DocumentType<T>` that no nameable type satisfies (see [mock-of-type.md](mock-of-type.md) § Limitations). This is the one place `as any` is the right call.

```typescript
jest.spyOn(ModelName, 'findById').mockResolvedValue(doc as any);
jest.spyOn(ModelName, 'findOne').mockResolvedValue(doc as any);
jest.spyOn(ModelName, 'find').mockResolvedValue([doc] as any);
jest.spyOn(ModelName, 'findByIdAndUpdate').mockResolvedValue(doc as any);
jest.spyOn(ModelName, 'findOneAndUpdate').mockResolvedValue(doc as any);
jest.spyOn(ModelName, 'create').mockResolvedValue(doc as any);
jest.spyOn(ModelName, 'updateMany').mockResolvedValue({} as any);
jest.spyOn(ModelName, 'deleteOne').mockResolvedValue({} as any);
```

### Accessing private fields

Prefer `service['field']` over `(service as any).field` — bracket notation bypasses `private` without discarding type information. Only use `(service as any)` when TypeScript actively prevents the operation, such as assigning to a `readonly` field.

## Assertions

Assert primarily on **return values** and **thrown errors** — the public contract of the method.

```typescript
// Thrown errors
await expect(service.method(input)).rejects.toThrow('Not found');
await expect(service.method(input)).rejects.toThrow(SomeErrorClass);

// Result value — prefer toMatchObject for partial shape assertions
expect(result).toEqual(expected);
expect(result).toMatchObject({ key: value });

// Logging — success
expect(mockLogger.info).toHaveBeenCalledWith(
  'Log message',
  expect.objectContaining({ key: value })
);

// Logging — failure (error object + context)
expect(mockLogger.error).toHaveBeenCalledWith(
  'Error message',
  expect.any(Error),
  expect.objectContaining({ contextKey: contextValue })
);
```

### When to assert on mock calls

Assert `toHaveBeenCalledWith` on a dependency **only when the call itself is the observable behaviour** — i.e. the method's job is to trigger that call:

```typescript
// DO — the point of the method is to charge the payment / send the notification
expect(paymentService.charge).toHaveBeenCalledWith(amount, currency);
expect(notificationService.send).toHaveBeenCalledWith(recipientId, template);
expect(eventBus.publish).toHaveBeenCalledWith(expect.any(OrderCreatedEvent));

// DON'T — these are HOW the method retrieves data, not WHAT it produces
expect(dep.findByUserId).toHaveBeenCalledWith(userId);
expect(ModelName.findById).toHaveBeenCalledWith(id);
```

Instead of asserting that a record was fetched by ID, assert that the result reflects the record's data:
```typescript
expect(result).toMatchObject({ customer: mockCustomer._id, status: 'PENDING' });
```

## Behavioral Testing Approach

1. **Analyze the function** — map every execution path (if/else, try/catch), error condition, and side effect (external calls, events, notifications).
2. **Create test cases** for each behaviour — what does the caller observe in this scenario? What is returned? What errors can be thrown?
3. **Set up test data** — minimal, realistic mocks. Use `new ObjectId()` for MongoDB IDs. Include all required fields. Make mocks representative of actual data.
4. **Verify** — assert on return values and thrown errors first. Assert on dependency calls only when the call itself is the observable behaviour (e.g., sending a notification, publishing an event, charging a payment).

## Common Patterns

### ObjectIds
Declare all IDs as named variables at the describe-block scope. Use `ObjectId` instances in mock data; use `.toHexString()` for input parameters.

Named IDs serve double duty: they wire up mock data AND anchor result assertions, so you can verify the result reflects the correct data without asserting on internal query calls.

```typescript
describe('methodName', () => {
  const tag1Id = new ObjectId();
  const tag2Id = new ObjectId();
  const userId = new ObjectId();

  const mockInput = {
    tagIds: [tag1Id.toHexString(), tag2Id.toHexString()],
    userId: userId.toHexString(),
  };

  const mockTags = [
    { _id: tag1Id, name: 'JavaScript' },
    { _id: tag2Id, name: 'React' },
  ];

  const mockData = {
    _id: new ObjectId(),
    tags: [tag1Id, tag2Id],
    createdBy: userId,
  };

  it('returns a result containing the provided tags', async () => {
    jest.spyOn(TagModel, 'find').mockResolvedValue(mockTags as any);

    const result = await service.method(mockInput);

    // Assert on what was produced, not how the tags were queried
    expect(result).toMatchObject({ tags: [tag1Id, tag2Id], createdBy: userId });
  });
});
```

**Key Points:**
- Declare all IDs as named variables at the top of the describe block
- Use hex strings (`toHexString()`) for input parameters when necessary
- Use ObjectId instances for mock data and database operations
- Use named IDs to assert result shape — avoids magic strings and avoids asserting on internal queries

### Error Propagation
```typescript
dep.method.mockRejectedValue(new Error('Dependency failed'));
await expect(service.method()).rejects.toThrow('Dependency failed');
expect(mockLogger.error).toHaveBeenCalled();
```

### Conditional Logic
Create separate tests for each branch:
- Test when condition is true
- Test when condition is false
- Test edge cases (null, undefined, empty)

### Multiple Model Operations in One Test
```typescript
it('returns the updated document with new status', async () => {
  jest.spyOn(ModelA, 'findById').mockResolvedValue(mockA as any);
  jest.spyOn(ModelB, 'find').mockResolvedValue([mockB1, mockB2] as any);
  jest.spyOn(ModelA, 'findByIdAndUpdate').mockResolvedValue(updatedA as any);

  const result = await service.method(params);

  expect(result).toMatchObject({ status: 'UPDATED', items: [mockB1._id, mockB2._id] });
});
```

## Full Example

```typescript
describe('assignLogBookSupervisor', () => {
  const orgUserId = new ObjectId();
  const organizationId = new ObjectId();
  const programId = new ObjectId();

  const mockOrgUser = {
    _id: orgUserId,
    organization: { _id: organizationId },
  };

  const mockProgram = {
    _id: programId,
    organization: { _id: organizationId },
    name: 'Test Program',
  };

  const params = { programId: programId.toHexString(), orgUserId: orgUserId.toHexString() };

  describe('Happy Paths', () => {
    it('returns the program with the supervisor assigned', async () => {
      jest.spyOn(ProgramModel, 'findById').mockResolvedValue(mockProgram as any);
      dep.findOrgUser.mockResolvedValue(mockOfType<OrgUser>(mockOrgUser));
      jest.spyOn(ProgramModel, 'findByIdAndUpdate').mockResolvedValue({
        ...mockProgram,
        supervisor: orgUserId,
      } as any);

      const result = await service.assignLogBookSupervisor(params);

      expect(result).toMatchObject({ _id: programId, supervisor: orgUserId });
    });
  });

  describe('Error Cases', () => {
    it('throws when program does not exist', async () => {
      jest.spyOn(ProgramModel, 'findById').mockResolvedValue(null);

      await expect(service.assignLogBookSupervisor(params)).rejects.toThrow('Not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('throws when org user belongs to a different organisation', async () => {
      jest.spyOn(ProgramModel, 'findById').mockResolvedValue(mockProgram as any);
      dep.findOrgUser.mockResolvedValue(
        mockOfType<OrgUser>({
          ...mockOrgUser,
          organization: { _id: new ObjectId() }, // different org
        }),
      );

      await expect(service.assignLogBookSupervisor(params)).rejects.toThrow();
    });

    it('propagates unexpected errors from dependencies', async () => {
      jest.spyOn(ProgramModel, 'findById').mockRejectedValue(new Error('DB error'));

      await expect(service.assignLogBookSupervisor(params)).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('logs success with context on assignment', async () => {
      jest.spyOn(ProgramModel, 'findById').mockResolvedValue(mockProgram as any);
      dep.findOrgUser.mockResolvedValue(mockOfType<OrgUser>(mockOrgUser));
      jest.spyOn(ProgramModel, 'findByIdAndUpdate').mockResolvedValue({
        ...mockProgram,
        supervisor: orgUserId,
      } as any);

      await service.assignLogBookSupervisor(params);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ programId: params.programId })
      );
    });

    it('logs error with context on failure', async () => {
      jest.spyOn(ProgramModel, 'findById').mockRejectedValue(new Error('DB error'));

      await expect(service.assignLogBookSupervisor(params)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({ programId: params.programId })
      );
    });
  });
});
```

## Coverage Goals

- [ ] All execution paths tested
- [ ] All error conditions tested
- [ ] Return values asserted with meaningful shape checks
- [ ] Significant log events verified (outcomes, not trace steps)
- [ ] Edge cases covered
- [ ] Dependency calls asserted only when the call is the observable behaviour

## Workflow

When invoked:
1. **Analyze** the target method — identify all behaviours, execution paths, and what the caller observes in each case.
2. **Write tests** covering happy paths, error cases, and logging in that order.
3. **Follow patterns above** — `jest.spyOn` for models, `createMock<T>()` for services.
4. **Assert on results** — return values and thrown errors first; mock call assertions only when the call itself is the behaviour.
5. **Run the tests** to verify they pass.
