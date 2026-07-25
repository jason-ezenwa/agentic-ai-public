# Code Quality Checklist

## 1. Type safety

- Are `any` or `unknown` types introduced without justification?
- Are type assertions (`as SomeType`) or non-null assertions (`!`) used where proper narrowing should be?
- Are function return types explicitly declared for public APIs?
- Are optional fields accessed without null checks?
- Are generics used where they'd eliminate unsafe casting? Does the code rely on type widening that could hide mismatches?
- Are fields declared as `field?: Type | null`? This conflates optional (may be absent) with nullable (present but null) and is almost never intentional — a truly nullable field should be `field: Type | null`, and a field that may be absent should be `field?: Type`.
- Is there "optional soup" — a spread of correlated optional fields representing what are really a few distinct, mutually exclusive shapes (the presence of one field implying the presence or absence of others)? Model these as a discriminated union keyed on a literal tag, so the type system enforces which fields coexist. Flag as a **Blocker** when the optionals make genuinely invalid states representable (a "success" carrying an `error`, or both a result and an error at once); flag as a **Warning** when the shapes are merely awkward but no invalid state is reachable.

## 2. Style

- Does the code follow the structural and organisational conventions of the codebase — module arrangement, file structure?
- For UI changes, does the new UI match the visual language of the surrounding product — spacing, typography, component usage, design system tokens, and page-layout patterns consistent with the rest of the product?

## 3. Rules compliance

- Does the code comply with the applicable global and project rules?

## 4. Code smells

Each smell reads *what it is → how to fix*; match it against the diff.

**Martin Fowler's code smells:**
- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

**Additional smells:**
- **Dead Code** — unused imports or variables, unreachable branches, leftover debug statements, or commented-out code in the change. → delete it; version control remembers.
- **Noisy Comment** — a comment that restates what the code already says, or is padded and wordy. → cut it; keep only comments that explain *why*, and keep those terse.
- **Long Function** — a function doing too much, too large to grasp at once. → split it into smaller, focused functions.
- **Magic Number / String** — a bare literal (number or string) with no name explaining what it means. → extract it to a named constant.
