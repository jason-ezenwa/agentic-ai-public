# Unit Testing — NestJS + Mongoose

Write behavioural unit tests for service methods using **Jest**, **`@nestjs/testing`** (`Test.createTestingModule()`), and **Mongoose**.

## Prerequisites

Check `package.json` Jest config before writing tests:

- **ESM packages** (e.g., `nanoid`): `"transformIgnorePatterns": ["node_modules/(?!nanoid/)"]`
- **Path aliases** (`src/` imports): `"moduleNameMapper": { "^src/(.*)$": "<rootDir>/$1" }`
- **Mongoose `@Prop` types**: Union types, enums, and const-derived types need explicit `type: String` in `@Prop()` decorators or tests will fail at import time with "Cannot determine a type".

```typescript
// BAD — Mongoose can't resolve these at runtime
@Prop({ required: true, enum: MyEnum })
field: MyEnum;

// GOOD — Add type: String
@Prop({ required: true, type: String, enum: MyEnum })
field: MyEnum;
```

## Setup Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ServiceName } from './service-name.service';
import { Document, DocumentDocument } from './document.schema';
import { DependencyService } from '../dependency/dependency.service';
import { mockOfType } from 'src/test-utils/mock-of-type'; // + mockOfTypeList for array resolves

// DO NOT jest.mock() models at module level — use jest.spyOn in individual tests

describe('ServiceName', () => {
  let service: ServiceName;
  let documentModel: Model<DocumentDocument>;
  let dependencyServiceA: DependencyServiceA;
  let dependencyServiceB: DependencyServiceB;

  const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: getModelToken(Document.name),
          useValue: {
            // include jest.fn() for every model method the service calls
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: DependencyServiceA,
          useValue: {
            // include jest.fn() for every method that will be spied on
            methodA: jest.fn(),
            methodB: jest.fn(),
          },
        },
        {
          provide: DependencyServiceB,
          useValue: { methodC: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    documentModel = module.get(getModelToken(Document.name));
    dependencyServiceA = module.get<DependencyServiceA>(DependencyServiceA);
    dependencyServiceB = module.get<DependencyServiceB>(DependencyServiceB);

    Object.defineProperty(service, 'logger', { value: mockLogger });
  });

  describe('methodName', () => {
    // Tests go here
  });
});
```

> **Rule:** Declare a `let` variable for every injected dependency — models and services alike — at the `describe` scope, and retrieve each one via `module.get()` in `beforeEach`, even if not every test uses it. This ensures `jest.spyOn` always targets the exact instance the service is using.

## Test Organization

Nest tests under `describe('methodName', () => { ... })` with three sub-groups:

### 1. Happy Paths
All successful execution paths: primary flow, alternative valid flows, edge cases that succeed.

### 2. Error Cases
All failure scenarios: missing/invalid inputs, not-found, validation failures, permission errors, dependency failures, error propagation.

### 3. Logging
Verify meaningful log events at key outcomes: `mockLogger.log` on success and `mockLogger.error` on failure, both with proper context objects.

Only assert on logs that confirm a significant outcome (e.g., "order created", "payment failed"). Do not assert on trace/debug logs for intermediate steps within a method (e.g., "fetching customer", "measurement found") — these are implementation noise, not observable behaviour.

## Test Names

Name tests as observable outcomes — what the method does, not how it does it.

```
// GOOD — outcome-focused
it('returns the created order with status PENDING')
it('throws NotFoundException when customer does not exist')
it('returns null when user is not found')

// BAD — implementation-focused
it('calls customerService.findByUserId with userId')
it('invokes measurementService.findById')
it('should handle tag validation')
```

## Mocking Patterns

### Typed mock data — prefer `mockOfType` over `as any`

Build mock **data** with `mockOfType<T>` / `mockOfTypeList<T>` instead of `as any`, so the fields you supply are type-checked against the real type. See [mock-of-type.md](mock-of-type.md) for the helper and the full decision table. In short:

- **Arguments**, **dependency return values**, and `.lean()` results → `mockOfType<T>(...)`.
- **Mongoose model document resolves** (`findOne`/`find`/`create`/… `.mockResolvedValue(doc)`) → keep `as any`; the hydrated-document type no nameable `T` can satisfy (see the reference's Limitations).

If the project has no such helper yet, create it per the reference, then import it.

### Dependency service methods (async)
```typescript
jest.spyOn(dep, 'method').mockResolvedValue(mockOfType<DepResult>(data)); // success
jest.spyOn(dep, 'method').mockResolvedValue(null);                        // not found
jest.spyOn(dep, 'method').mockRejectedValue(new Error('msg'));            // failure
```

### Mongoose models — always `jest.spyOn`, never `jest.mock`

> Document resolves keep `as any` — Mongoose types the resolved value as a hydrated document that no nameable type satisfies (see [mock-of-type.md](mock-of-type.md) § Limitations). This is the one place `as any` is the right call.

```typescript
// Simple calls (no chaining — when service awaits model method directly)
jest.spyOn(documentModel, 'findById').mockResolvedValue(doc as any);
jest.spyOn(documentModel, 'findOne').mockResolvedValue(doc as any);
jest.spyOn(documentModel, 'find').mockResolvedValue([doc] as any);
jest.spyOn(documentModel, 'findByIdAndUpdate').mockResolvedValue(doc as any);
jest.spyOn(documentModel, 'findOneAndUpdate').mockResolvedValue(doc as any);
jest.spyOn(documentModel, 'create').mockResolvedValue(doc as any);
jest.spyOn(documentModel, 'updateMany').mockResolvedValue({} as any);
jest.spyOn(documentModel, 'deleteOne').mockResolvedValue({} as any);
jest.spyOn(documentModel, 'countDocuments').mockResolvedValue(5 as any);
jest.spyOn(documentModel, 'aggregate').mockResolvedValue([doc] as any);

// With chaining (populate, exec, sort, etc.)
jest.spyOn(documentModel, 'findById').mockReturnValue({
  populate: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(doc),
  }),
} as any);

jest.spyOn(documentModel, 'find').mockReturnValue({
  populate: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([doc1, doc2]),
    }),
  }),
} as any);
```

### Mocking document creation

**When the service uses `model.create()`:**
```typescript
jest.spyOn(documentModel, 'create').mockResolvedValue(mockDoc as any);
```

**When the service uses `new this.model() + .save()`:**

Because `@InjectModel` properties are `private readonly`, direct reassignment (`service['documentModel'] = MockModel`) produces TS2540. Cast through `any` on the left:
```typescript
const mockDocInstance = {
  _id: new Types.ObjectId(),
  field: value,
  save: jest.fn().mockResolvedValue(undefined),
};
const MockModel = jest.fn().mockImplementation(() => mockDocInstance);
(service as any)['documentModel'] = MockModel; // `as any` required — readonly blocks bracket assignment
```

### Accessing private fields

Prefer `service['field']` over `(service as any).field` — bracket notation bypasses `private` without discarding type information. Only use `(service as any)` when TypeScript actively prevents the operation, such as assigning to a `readonly` field.

Prefer asserting on the returned document's shape rather than that `new Model()` or `.save()` were called.

## Assertions

Assert primarily on **return values** and **thrown errors** — the public contract of the method.

```typescript
// NestJS exceptions — type, message, or both
await expect(service.method(input)).rejects.toThrow(NotFoundException);
await expect(service.method(input)).rejects.toThrow('Not found');
await expect(service.method(input)).rejects.toThrowError(
  new NotFoundException('Not found')
);

// Result value — prefer toMatchObject for partial shape assertions
expect(result).toEqual(expected);
expect(result).toMatchObject({ key: value });

// Logging — success
expect(mockLogger.log).toHaveBeenCalledWith(
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
// DO — the point of the method is to charge the payment / send the email
expect(paymentService.charge).toHaveBeenCalledWith(amount, currency);
expect(notificationService.sendEmail).toHaveBeenCalledWith(recipientEmail, template);
expect(eventBus.publish).toHaveBeenCalledWith(expect.any(OrderCreatedEvent));

// DON'T — these are HOW the method retrieves data, not WHAT it produces
expect(customerService.findByUserId).toHaveBeenCalledWith(userId);
expect(measurementService.findById).toHaveBeenCalledWith(measurementId);
expect(documentModel.findById).toHaveBeenCalledWith(id);
```

Instead of asserting that customer was fetched by ID, assert that the result reflects the customer's data:
```typescript
expect(result).toMatchObject({ customer: mockCustomer._id, status: 'PENDING' });
```

## Behavioral Testing Approach

1. **Analyze the function** — map every execution path (if/else, try/catch), error condition, and side effect (external calls, events, notifications).
2. **Create test cases** for each behaviour — what does the caller observe in this scenario? What is returned? What errors can be thrown?
3. **Set up test data** — minimal, realistic mocks. Use `Types.ObjectId()` for MongoDB IDs. Include all required schema fields. Make mocks representative of actual data.
4. **Verify** — assert on return values and thrown errors first. Assert on dependency calls only when the call itself is the observable behaviour (e.g., sending a notification, publishing an event, charging a payment).

## Common Patterns

### ObjectIds
Declare all IDs as named variables at the describe-block scope. Use `Types.ObjectId` instances in mock data; use `.toHexString()` for input parameters.

Named IDs serve double duty: they wire up mock data AND anchor result assertions, so you can verify the result reflects the correct data without asserting on internal query calls.

```typescript
describe('methodName', () => {
  const tag1Id = new Types.ObjectId();
  const tag2Id = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const organizationId = new Types.ObjectId().toHexString();

  const mockInput = {
    tagIds: [tag1Id.toHexString(), tag2Id.toHexString()],
    userId: userId.toHexString(),
  };

  const mockTags = [
    { _id: tag1Id, name: 'JavaScript' },
    { _id: tag2Id, name: 'React' },
  ];

  const mockData = {
    _id: new Types.ObjectId(),
    tags: [tag1Id, tag2Id],       // ObjectId instances in data
    createdBy: userId,
    organization: organizationId,
  };

  it('returns a result with the provided tags', async () => {
    jest.spyOn(tagModel, 'find').mockResolvedValue(mockTags as any);

    const result = await service.method(mockInput);

    // Assert on what was produced, not how the tags were queried
    expect(result).toMatchObject({ tags: [tag1Id, tag2Id], createdBy: userId });
  });
});
```

**Key Points**:
- Declare all IDs as named variables at the top of the describe block
- Use hex strings (`toHexString()`) for input parameters and arrays when necessary
- Use ObjectId instances for mock data and database operations
- Use named IDs to assert result shape — avoids magic strings and avoids asserting on internal queries

### Error Propagation
```typescript
jest.spyOn(dep, 'method').mockRejectedValue(new Error('Dependency failed'));
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
  jest.spyOn(modelA, 'findById').mockResolvedValue(mockA as any);
  jest.spyOn(modelB, 'find').mockResolvedValue([mockB1, mockB2] as any);
  jest.spyOn(modelA, 'findByIdAndUpdate').mockResolvedValue(updatedA as any);

  const result = await service.method(params);

  expect(result).toMatchObject({ status: 'UPDATED', items: [mockB1._id, mockB2._id] });
});
```

## Full Example

```typescript
describe('createCustomerOrder', () => {
  const customerId = new Types.ObjectId();
  const measurementId = new Types.ObjectId();
  const addressId = new Types.ObjectId();

  const mockCustomer = { _id: customerId, userId };
  const mockMeasurement = { _id: measurementId, customer: customerId };
  const mockAddress = { _id: addressId };

  const createOrderDto = {
    measurementId: measurementId.toHexString(),
    addressId: addressId.toHexString(),
    desiredTailorLocation: 'NG',
    description: 'Test order',
    outfitType: 'agbada',
    addOnIds: [],
  };

  describe('Happy Paths', () => {
    it('returns a PENDING order linked to the customer and measurement', async () => {
      jest.spyOn(customerService, 'findByUserId').mockResolvedValue(mockOfType<Customer>(mockCustomer));
      jest.spyOn(measurementService, 'findById').mockResolvedValue(mockOfType<Measurement>(mockMeasurement));
      jest.spyOn(addressService, 'findById').mockResolvedValue(mockOfType<Address>(mockAddress));

      const result = await service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto));

      expect(result).toMatchObject({
        status: 'PENDING',
        customer: customerId,
        measurement: measurementId,
      });
    });
  });

  describe('Error Cases', () => {
    it('throws NotFoundException when customer does not exist', async () => {
      jest.spyOn(customerService, 'findByUserId').mockResolvedValue(null);

      await expect(
        service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto))
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when measurement belongs to a different customer', async () => {
      jest.spyOn(customerService, 'findByUserId').mockResolvedValue(mockOfType<Customer>(mockCustomer));
      jest.spyOn(measurementService, 'findById').mockResolvedValue(
        mockOfType<Measurement>({
          ...mockMeasurement,
          customer: new Types.ObjectId(), // Different customer
        }),
      );

      await expect(
        service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto))
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates unexpected errors from dependencies', async () => {
      jest.spyOn(customerService, 'findByUserId').mockRejectedValue(new Error('DB error'));

      await expect(
        service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto))
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('logs order created with context on success', async () => {
      jest.spyOn(customerService, 'findByUserId').mockResolvedValue(mockOfType<Customer>(mockCustomer));
      jest.spyOn(measurementService, 'findById').mockResolvedValue(mockOfType<Measurement>(mockMeasurement));
      jest.spyOn(addressService, 'findById').mockResolvedValue(mockOfType<Address>(mockAddress));

      await service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto));

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Customer order created',
        expect.objectContaining({ userId })
      );
    });

    it('logs error with context on failure', async () => {
      jest.spyOn(customerService, 'findByUserId').mockRejectedValue(new Error('DB error'));

      await expect(
        service.createCustomerOrder(userId, mockOfType<CreateOrderDto>(createOrderDto))
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({ userId })
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
3. **Follow patterns above** — `jest.spyOn` for models, `jest.fn()` stubs in all providers.
4. **Assert on results** — return values and thrown errors first; mock call assertions only when the call itself is the behaviour.
5. **Run the tests** to verify they pass.
