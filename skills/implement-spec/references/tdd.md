# Test-Driven Development

## Philosophy

Write one test for one behaviour → make it pass with minimal code → repeat. Never write all tests up front then all implementation — this produces tests that check shape rather than behaviour and desensitises you to real changes.

The unit under test is a service method or utility function. Its "interface" is its inputs, return values, and thrown errors. Test those — not which internal methods were called.

For test setup patterns, tooling, and mocking conventions, invoke the `/unit-testing` skill.

## Scope

TDD applies to:
- Service files (e.g. `*.service.ts`)
- Utility functions

TDD does **not** apply to DTOs, models, resolvers, or config files — implement those directly.

## Sequential Only

TDD requires tight feedback loops and is not suitable for parallel work. Do not delegate service file implementation to subagents — implement them yourself in the main session, iterating through the RED-GREEN-refactor cycle sequentially.

---

## Workflow

### 1. Planning

Before writing any code:

1. Read the spec or task description and identify the service methods / utility functions to implement.
2. For each method, list the **behaviours** to test — not implementation steps. Focus on:
   - The primary success path
   - Distinct failure / error conditions
   - Edge cases that change the outcome
3. **Confirm with the user** which behaviours to test and in what priority order. You cannot test everything — ask: "Here are the behaviours I plan to test for each method — does this look right, and is there anything to add or skip?"
4. **Get user approval** on the list before writing any test.

### 2. Tracer Bullet

Write **one test** for the first and most fundamental behaviour. Run it — it should fail (RED). Write the minimal code to make it pass (GREEN). This proves the path works end-to-end.

```
RED:   Write test for first behaviour → fails
GREEN: Write minimal code to pass → passes
```

### 3. Incremental Loop

For each remaining behaviour, one at a time:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:
- One test at a time — do not write ahead
- Only enough code to pass the current test
- Do not anticipate future tests
- Assert on return values and thrown errors first; mock call assertions are secondary

### 4. Refactor

Once all tests are GREEN, look for:
- Duplication → extract helper
- Long methods → break into private helpers (keep tests on the public interface)
- Overly complex conditionals → simplify
- Run tests after every refactor step — never refactor while RED

---

## Per-Cycle Checklist

```
[ ] Test describes a behaviour, not an implementation step
[ ] Test name says WHAT the method does, not HOW
[ ] Assertion is primarily on return value or thrown error
[ ] Code is minimal for this test only
[ ] All tests still pass after refactor
```

---

## Test Name Convention

Name tests as observable outcomes:

```
// GOOD — describes what happens
it('returns null when user is not found')
it('throws when the organisation does not exist')
it('returns the created invoice with generated id')

// BAD — describes how
it('calls UserModel.findById with the userId')
it('invokes paymentService.charge')
```
