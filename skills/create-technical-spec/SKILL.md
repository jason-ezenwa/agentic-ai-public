---
name: create-technical-spec
description: Generates a technical specification document for a new feature or product.
---

# Create Technical Spec

This skill guides the creation of technical specification documents using a standardized template.

## Instructions

1.  **Analyze the Requirement**: Understand the feature or product being requested.
2.  **Generate Content**: Use the template below to structure the document.
    -   **Flexible Application**: Not every use case requires every section of the template. Use your best judgment to determine which sections are relevant and necessary for the specific task. Omit sections that are not applicable.
    -   **Professional Tone**: Maintain a clear, concise, and professional technical writing style.
    -   **Figma Drives UI, Not Prose**: When Figma or other design references exist, link them and let the implementing agent read the design directly — don't describe colors, spacing, layout, or copy in prose. A wrong description in the spec risks being what gets implemented instead of the actual design. Describe UI details directly only when no Figma or design reference is provided.
    -   **No Repetition**: Don't restate the same fact across sections. A repeat is fine when it adds new information (e.g. a code snippet backing up a rule already stated in prose); repeating the same information in the same form is not.
3.  **Publish the Spec**: See **Publishing** below.
4.  **QA Test Plan**: After the spec is published, propose a QA test plan to the user. Draft a suggested plan based on the spec's goals, API design, and any Figma references, then present it with the following structure:
    - A brief summary of what will be tested
    - Step-by-step test scenarios (happy path first, then edge cases and error states)
    - Expected outcomes for each scenario

    Ask the user to confirm, adjust, or skip the test plan. If confirmed or adjusted, add the finalised plan as a `## QA Test Plan` section to the issue (`gh issue edit <num> --body-file <new>`). If skipped, leave the section out — do not add a placeholder.
5.  **Confirm Approval Status**: Once the spec is finalised, ask the user whether it is approved. If they approve, update the **Status** field in the spec from `Draft` to `Approved` (edit the issue accordingly). If it is not yet approved, leave the status as `Draft`.

## Publishing

The spec is created directly as a GitHub issue on the current repo.

1.  Confirm the working directory is inside a GitHub repo (`gh repo view`).
2.  Ensure the `spec` label exists on the repo without overwriting an existing one: `gh label create spec --color 4C47EA --description "Technical or product spec that can be picked up by an agent" 2>/dev/null || true`. This creates the label if missing and is a no-op if it already exists (regardless of the existing color or description).
3.  Generate the spec content using the template.
4.  Write the body to a tempfile under `/tmp` (e.g. `/tmp/spec-<feature-name>-<timestamp>.md`). `/tmp` is cleared on reboot, so no manual cleanup is required.
5.  Create the issue: `gh issue create --title "<Feature Name> Technical Spec" --label spec --body-file /tmp/spec-<feature-name>-<timestamp>.md`. The body's `# <Feature Name> Technical Spec` heading must match this title exactly.
6.  Report the issue URL and number back to the user.

## Editing After Creation

Once the spec is published, the **issue body is the source of truth**. Make edits directly on the issue: write the updated body to a temporary file, cross-check it contains only the intended changes, then apply with `gh issue edit <num> --body-file <new>`.

## Technical Spec Template

```markdown
# [Feature/Product Name] Technical Spec

**Author**: [Author's name] | **Status**: Draft/Approved | **Date**: [YYYY-MM-DD]
**Product Spec**: [Link]

---

## Overview
Top-level, 1-2 sentences on WHAT we're building and why (link to product spec if any)

---

## Figma References (when translating designs to code)

Group Figma frame URLs by purpose, e.g.:
- Full-page layouts
- Component references
- Asset nodes (icons, images to export)

Each entry is a clickable Markdown link to the user-provided URL with a short label. No node IDs in body text — the URL is enough.

---

## Goals & Non-Goals
**Goals**:
- Highly performant code
- App builds with no introduced lint or type errors
- Pixel-perfect parity with the Figma frames (if the spec has a Figma References section)
- Code follows React best practices (if the spec involves React components, hooks, or pages)
- [Other technical objectives e.g. scalability, performance targets]

**Non-Goals**: What we're explicitly not doing in this iteration

---

## Current System
**Summary**: 2-3 sentences on how the relevant part of the system works today (prose, not a diagram)
**Gaps**: What the system doesn't do yet
**What We'll Leverage**: Existing code, patterns, infrastructure we can reuse

---

## Proposed Architecture
**Diagram**: High-level architecture showing major components and data flow
**Component Overview**: Table of components and the change expected in each

---

## API Design
For each endpoint:
- **`METHOD /path`**: Purpose, auth requirements
- **Request**: Schema/format
- **Response**: Success and error formats
- **Validation**: What's checked
- **Error Codes**: 400, 401, 404, 500, etc.

---

## Data Models
For each model:
- **Schema**: Table/collection structure with types and constraints
- **Indexes**: Which columns/fields, for what query patterns
- **Migrations**: What needs to change in the database

---

## Architecture Decisions (ADRs)
For each major decision:
- **Decision**: What we're deciding
- **Options**: 2-3 alternatives considered with pros/cons
- **Choice**: Which we chose and why
- **Trade-offs**: What we're accepting

---

## Security
- **Data Protection**: Encryption at rest/transit, PII handling
- **Security Testing**: OWASP checks, dependency scanning

---

## Observability
- **Logging**: Log the core parts of the change (key state transitions, external calls, failures) — not everywhere. Note what must NOT be logged (PII, secrets).

---

## Testing
- **Unit Tests**: Coverage targets, what to test
- **Integration Tests**: API flows, database operations
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load/stress/soak test scenarios

---

## QA Test Plan
> Added after spec creation by agreement with the author. Omit this section if no test plan was agreed upon.

- **Scope**: Features and flows covered by this test run
- **Scenarios**:
  1. [Happy path scenario — step-by-step]
  2. [Edge case or error scenario — step-by-step]
  *(add as many scenarios as needed)*
- **Expected Outcomes**: What "pass" looks like for each scenario

---

## Dependencies & Risks
- **External Dependencies**: Services we rely on, SLAs, fallback strategies
- **Technical Risks**: Risk | Impact | Likelihood | Mitigation
- **Timeline Risks**: Critical path items, mitigation strategies

---

## Documentation
- [ ] API docs (Insomnia/OpenAPI/Swagger)
- [ ] Architecture diagrams
- [ ] Developer guide
```
