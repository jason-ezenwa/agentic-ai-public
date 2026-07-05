# Typed Mock Data — `mockOfType`

A tiny helper that replaces `as any` on **mock data** with a *type-checked* partial. The fields you supply are validated against the real type — so a typo or a renamed/removed property fails to compile — while fields irrelevant to the test may be omitted.

Use it for the data you build in a test: service-method **arguments**, **dependency** return values, and `.lean()` results. It does **not** apply to Mongoose/Typegoose hydrated-document resolves — see [Limitations](#limitations).

## The helper

If the project already exports these helpers (search for `mockOfType`, e.g. `src/test-utils/mock-of-type.ts`), import them. **If they do not exist, create the file** at `<test-root>/test-utils/mock-of-type.ts` with the content below, then import from there.

> Keep this file out of the production build — exclude its folder in `tsconfig.build.json` (e.g. add `"src/test-utils"` to `exclude`), since it is test-only.

```typescript
/**
 * Build a single mock that is shaped like a real `T` but only carries the
 * fields a given test exercises, while still being typed as a full `T`.
 *
 * Use this for mock data whose target type can be named — service-method
 * arguments, dependency return values, and `.lean()` results — in place of
 * `as any` (which silences all type checking). The value is checked against
 * `Partial<T>`, so any field you *do* supply must match `T`'s real shape
 * (typos and renamed properties fail to compile); fields irrelevant to the
 * test may be omitted.
 *
 * NOT for Mongoose/Typegoose hydrated-document resolves: a model's
 * `findOne`/`find().mockResolvedValue(...)` expects a fully hydrated document
 * type that no partial — and no nameable `T` — satisfies. Keep `as any` there.
 *
 * @typeParam T - The type the supplied fields are checked against (e.g. a DTO,
 *                a dependency method's return type, or a `.lean()` row type).
 *
 * @example
 * // service-method argument
 * await service.reviewEssay(mockOfType<ReviewEssayDto>({ essayId }));
 *
 * // dependency return value
 * jest.spyOn(studentService, 'findById').mockResolvedValue(
 *   mockOfType<Student>({ firstName: 'Ada' }),
 * );
 */
export const mockOfType = <T>(value: Partial<T>): T => value as T;

/**
 * Build an array of mocks, each shaped like a real `T` but only carrying the
 * fields a given test exercises, while the array is typed as `T[]`.
 *
 * The array-returning counterpart to {@link mockOfType} — for arguments,
 * dependency return values, and `.lean()` results that are collections. It maps
 * each element through {@link mockOfType}, so every element is individually
 * type-checked against `Partial<T>` and the unsafe cast stays defined in exactly
 * one place. Like {@link mockOfType}, not for hydrated-document
 * `find().mockResolvedValue(...)` resolves — keep `as any` there.
 *
 * @typeParam T - The element type the supplied fields are checked against.
 *
 * @example
 * jest.spyOn(essayService, 'listLeanByStudent').mockResolvedValue(
 *   mockOfTypeList<LeanEssay>(
 *     { title: 'First' },
 *     { title: 'Second' },
 *   ),
 * );
 */
export const mockOfTypeList = <T>(...items: Partial<T>[]): T[] =>
  items.map((item) => mockOfType<T>(item));
```

Import it:

```typescript
import { mockOfType, mockOfTypeList } from 'src/test-utils/mock-of-type';
```

## When to use what

The rule is: prefer the most specific tool the target type allows. Reach for `as any` last, and only for the one case where nothing else compiles.

| Target of the cast | Use | Why |
| :--- | :--- | :--- |
| Service-method **arguments** (DTOs, params) | `mockOfType<T>` / `mockOfTypeList<T>` | nameable type → supplied fields get checked |
| **Dependency** method return values | `mockOfType<T>` / `mockOfTypeList<T>` | the declared return type is plain/nameable |
| `.lean()` query results | `mockOfType<T>` / `mockOfTypeList<T>` | resolves to a plain object, not a document |
| **Library-internal** types (e.g. a Zod `.shape`, an AI-SDK message part) | `as unknown as T` | the helper can't produce it, but the type is nameable — keep the cast contained, not `any` |
| **Mongoose / Typegoose hydrated-document** resolves (`findOne`, `find`, `create`, `findByIdAndUpdate`, `save`, …) | `as any` | see [Limitations](#limitations) |

## Limitations

`mockOfType` works wherever the target is a type you can **name**. It stops at exactly one boundary: the value a Mongoose/Typegoose query **resolves to**.

`mockResolvedValue` on a model method does not expect your `Essay`/`EssayDocument` — it expects Mongoose's fully *hydrated* document type: your data **plus** ~50 internal members (`_id`, `save`, `populate`, `toObject`, …), often a doubly-nested `HydratedDocument<…>`. A partial mock can never satisfy that, and neither `mockOfType<EssayDocument>(…)` nor `as unknown as EssayDocument` compiles against it. So for **document resolves only**, fall back to `as any`:

```typescript
// Document resolve — keep `as any` (no nameable type satisfies the hydrated type)
jest.spyOn(essayModel, 'findOne').mockResolvedValue(essayDoc as any);

// But the ARGUMENT and DEPENDENCY return in the same test use mockOfType
const result = await service.reviewEssay(
  mockOfType<ReviewEssayDto>({ essayId: essayId.toHexString() }),
);
jest.spyOn(studentService, 'findById').mockResolvedValue(
  mockOfType<Student>({ firstName: 'Ada' }),
);
```

This is a Mongoose typing limitation, not a gap a mocking library can close — `@golevelup/ts-jest`'s `createMock` does not relax it either. Don't spend effort trying to type these; `as any` on a document resolve is the correct, intended choice.
