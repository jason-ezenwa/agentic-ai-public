# Feature Correctness Checklist

## 1. Correctness

- Does the code match the stated intent, spec, or acceptance criteria — not merely stay internally consistent? A missing required behaviour is a finding.
- Are there logic errors: inverted conditions, a wrong operator (`&&` vs `||`, `<` vs `<=`), off-by-one, a wrong default, or a branch that returns the wrong value?
- Does every code path produce the right result, or only the happy path?

## 2. Edge cases

- Are error conditions and boundary inputs handled — null/undefined, empty collection or string, zero, negative, very large inputs, duplicate or out-of-order items, missing optional fields, unexpected types?
- Does the code degrade gracefully at these boundaries rather than crashing or silently producing wrong output?

## 3. Unintended behaviour change / regression

- Does the change alter behaviour for existing, untouched call sites — renamed or removed fields, changed defaults, an altered response shape, or a modified shared helper that other callers depend on?
- Changes to shared code should be checked against their other consumers, not just the new one.

## 4. Concurrency, races & idempotency

- Are there shared mutable state issues, missing locks, or async operations that can interleave unsafely?
- Are database writes atomic where they need to be?
- For handlers with external side effects (writes, payments, emails, webhooks), are operations idempotent — safe against retries, duplicate requests, or double-execution — so a repeated call doesn't double-charge or double-send?

## 5. Performance

- For React/Next.js code, run `/vercel-react-best-practices` and apply its findings.
- For backend code, look for: N+1 queries, synchronous blocking calls in async paths, unbounded loops over large datasets, missing pagination on collection queries, repeated expensive computations that should be cached.

## 6. Security

- Are there hardcoded secrets?
- Are unsanitised inputs passed to queries or shell commands?
- Are there insecure direct object references — accessing resources by ID without ownership or permission checks?
- Are authentication or authorisation checks missing or bypassable?
- Are there unsafe file operations (path traversal, unrestricted upload types)?
- Is rate limiting absent on endpoints that accept user-controlled input?

## 7. Error propagation

- Are errors caught at the right layer or silently swallowed?
- Are exceptions re-thrown, wrapped, or returned in a way consistent with the module's contract?

## 8. API & backward compatibility

- Is the code unnecessarily defensive — compatibility shims, re-exports, deprecated wrappers, or fallback handling added speculatively rather than for a known consumer? Flag this. Defensive backward compatibility is only warranted when there is clear evidence of existing consumers (deployed to production, actively used by other modules, versioned contract). If it is unclear, ask the user rather than assuming it is needed.
- When backward compatibility genuinely is required, is it actually doing the right thing — removed fields accounted for, response shapes preserved, consumers of renamed endpoints handled?

## 9. Test quality

- If tests are present, consult `/unit-testing` if available to understand the conventions and patterns tests in this codebase should follow; non-compliance with those conventions is a finding.
- Are they asserting on outcomes (return values, thrown errors) rather than implementation details (which methods were called, in what order)?
- Do they cover real edge cases rather than just the happy path?
- Do test names describe observable behaviour?
- Would these tests catch a regression if the implementation changed?
