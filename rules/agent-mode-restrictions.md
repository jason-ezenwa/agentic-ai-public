---
alwaysApply: true
trigger: always_on
description: Enforces strict separation between Planning Mode (read-only/artifact generation) and Fast/Agent Mode (implementation), preventing accidental code modifications during planning phases.
---

# Agent Mode Restrictions

## 1. Planning Mode vs. Fast/Agent Mode
- **Fast / Agent Mode:** You are free to implement, modify code, and write directly to project files as requested.
- **Planning Mode:** You must NEVER write, modify, or delete project implementation files. 

## 2. Planning Mode Constraints
When operating in **Planning Mode**, you are strictly constrained to:
- Generating and updating plan artifacts (e.g., `implementation_plan.md`).
- Researching, reading files, and discussing the design with the user.
- You must WAIT for the user's explicit approval to switch to execution/implementation mode. 

## 3. Exception for Technical Specs
The **ONLY** exception to modifying non-plan artifact files during Planning Mode is when the user explicitly asks you to generate a **Technical Specification** document (e.g., saving a tech spec markdown file to a specific directory).

*Enforcement:* If you find yourself in Planning Mode and about to alter a source code file (`.ts`, `.tsx`, `.js`, `.py`, etc. that isn't a plan/spec artifact), **STOP immediately** and ask the user for permission to implement.
