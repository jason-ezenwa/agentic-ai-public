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

---

## Workflow

### 1. Planning

Before writing any code, identify the service methods / utility functions to implement and the **behaviours** to test for each — not implementation steps. Start with the behaviours the spec calls out for testing, then add any others that are worthwhile: the primary success path, distinct failure conditions, and edge cases that change the outcome.

### 2. RED-GREEN Loop

Start with one test for the first and most fundamental behaviour — this is the tracer bullet that proves the path works end-to-end. Then repeat for each remaining behaviour:

```
RED:   Write the next test → fails
GREEN: Write minimal code to pass → passes
```

Rules:
- One test at a time — do not write ahead
- Only enough code to pass the current test; do not anticipate future tests
- Assert on return values and thrown errors first; mock call assertions are secondary

### 3. Refactor

Once all tests are GREEN, clean up duplication and overly long or complex methods, keeping tests on the public interface. Run tests after every step — never refactor while RED.

---

## Test Name Convention

Name tests as observable outcomes, not mechanics:

```
// GOOD
it('returns the created invoice with generated id')

// BAD
it('invokes paymentService.charge')
```
