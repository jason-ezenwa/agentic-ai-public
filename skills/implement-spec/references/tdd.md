# Test-Driven Development

## Philosophy

Write one test for one behaviour → make it pass with minimal code → repeat. Never write all tests up front then all implementation — this produces tests that check shape rather than behaviour and desensitises you to real changes.

## Scope

TDD applies to any behaviour with logic, at whichever level proves it.

---

## Workflow

### 1. Planning

Before writing any code, identify the **behaviours** to test, not implementation steps. Start with the behaviours the spec calls out for testing, then add any others that are worthwhile: the primary success path, distinct failure conditions, and edge cases that change the outcome.

### 2. RED-GREEN Loop

Start with one test for the first and most fundamental behaviour — this is the tracer bullet that proves the path works end-to-end. Then repeat for each remaining behaviour:

```
RED:   Write the next test → fails
GREEN: Write minimal code to pass → passes
```

Rules:
- One test at a time — do not write ahead
- Only enough code to pass the current test; do not anticipate future tests

---

## Test Name Convention

Name tests as observable outcomes, not mechanics:

```
// GOOD
it('returns the created invoice with generated id')

// BAD
it('invokes paymentService.charge')
```
