---
name: create-technical-spec
description: Generates a technical specification document for a new feature or product.
---

# Create Technical Spec

This skill guides the creation of technical specification documents using a standardized template.

## Instructions

1.  **Analyze the Requirement**: Understand the feature or product being requested.
2.  **Determine Output Mode**: The spec can be written as a local file (default), created directly as a GitHub issue on the current repo, or promoted from an existing local file to a GitHub issue. See **Output Modes** below.
3.  **Generate Content**: Use the template below to structure the document.
    -   **Flexible Application**: Not every use case requires every section of the template. Use your best judgment to determine which sections are relevant and necessary for the specific task. Omit sections that are not applicable.
    -   **Professional Tone**: Maintain a clear, concise, and professional technical writing style.
4.  **Write the Spec**: Save or publish according to the selected mode.
5.  **QA Test Plan**: After the spec is written, propose a QA test plan to the user. Draft a suggested plan based on the spec's goals, API design, and any Figma references, then present it with the following structure:
    - A brief summary of what will be tested
    - Step-by-step test scenarios (happy path first, then edge cases and error states)
    - Expected outcomes for each scenario

    Ask the user to confirm, adjust, or skip the test plan. If confirmed or adjusted, add the finalised plan as a `## QA Test Plan` section in the spec (update the file/issue accordingly). If skipped, leave the section out — do not add a placeholder.
6.  **Confirm Approval Status**: Once the spec is finalised, ask the user whether it is approved. If they approve, update the **Status** field in the spec from `Draft` to `Approved` (edit the file or issue accordingly). If it is not yet approved, leave the status as `Draft`.

## Output Modes

The skill supports three modes. Detect the mode from the user's request — accept both explicit tokens and natural phrasing. Default to **Local** when no issue-related intent is expressed.

### 1. Local (default)
The spec is saved as a markdown file in the workspace.

-   **Target Directory**: `docs/technical-specs/` at the root of the workspace (create if missing)
-   **Filename Format**: `<feature-name>.md` (e.g., `docs/technical-specs/user-authentication.md`)

### 2. Issue (create directly on GitHub)
Skip the local file and create a GitHub issue on the current repo. Use this when the user wants the spec to be reachable by cloud sessions from the outset.

**Triggers** — either is sufficient:
-   **Tokens**: `--issue` or `--as-issue` appearing in the user's request
-   **Phrases**: "as an issue", "as a GitHub issue", "issue-only", "directly as an issue", or similar clear intent that the spec should live *as* an issue from the start (not generated locally first)

**Steps**:
1.  Confirm the working directory is inside a GitHub repo (`gh repo view`).
2.  Ensure the `spec` label exists on the repo without overwriting an existing one: `gh label create spec --color 4C47EA --description "technical or product spec that can be picked up by an agent" 2>/dev/null || true`. This creates the label if missing and is a no-op if it already exists (regardless of the existing color or description).
3.  Generate the spec content using the template.
4.  Write the body to a tempfile under `/tmp` (e.g. `/tmp/spec-<feature-name>-<timestamp>.md`). `/tmp` is cleared on reboot, so no manual cleanup is required.
5.  Create the issue: `gh issue create --title "<Feature Name> — Technical Spec" --label spec --body-file /tmp/spec-<feature-name>-<timestamp>.md`.
6.  Report the issue URL and number back to the user. Do not leave a local file in the workspace.

### 3. Promote (local → issue, keep local as reference)
Take an existing local spec file and publish it as a GitHub issue. The local file is kept and stamped with the issue number and URL so it can be re-fetched later.

**Triggers** — either is sufficient:
-   **Tokens**: `--promote` appearing in the user's request, typically with a path (e.g. `--promote specs/foo.md`)
-   **Phrases**: "promote this spec to an issue", "promote the spec at `<path>` to an issue", or similar phrasing that explicitly uses "promote"

**Steps**:
1.  Read the local spec file.
2.  Ensure the `spec` label exists on the repo without overwriting an existing one: `gh label create spec --color 4C47EA --description "technical or product spec that can be picked up by an agent" 2>/dev/null || true`. This creates the label if missing and is a no-op if it already exists (regardless of the existing color or description).
3.  Create the issue: `gh issue create --title "<Title> — Technical Spec" --label spec --body-file <path-to-local-spec>`. The local spec file itself is used as the body source — no tempfile needed.
4.  Stamp the local file by inserting an HTML comment at the top of the body (below the title), e.g.:

    ```markdown
    <!-- github-issue: #42 https://github.com/<owner>/<repo>/issues/42 -->
    ```

5.  Report the issue URL and confirm the local file has been stamped.

## Editing After Promotion or Issue Creation

Once a spec lives as an issue, treat the **issue body as the source of truth**. Local copies may go stale — that's expected.

-   **Edits**: made directly on the issue (via `gh issue edit <num> --body-file <new>` locally, or through the issue UI in any cloud session).
-   **Refreshing a local copy**: on explicit user request, re-fetch the issue body with `gh issue view <num> --json body -q .body` and overwrite the local file (preserving the stamp line).
-   Do **not** attempt automatic bidirectional sync.

## Technical Spec Template

```markdown
# Technical Spec

**Title**: [Feature/Product Name] - Technical Spec
**Author**: [Author's name] | **Status**: Draft/Approved | **Date**: [YYYY-MM-DD]
**Product Spec**: [Link]

---

## Overview
**Product Context**: 1-2 sentences on WHAT we're building (link to product spec if any)
**Technical Approach**: 2-3 sentences on HOW we'll build it
**Key Technologies**: Languages, frameworks, databases, infrastructure

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
**Existing Architecture**: Brief description or diagram of relevant current state
**Limitations**: What doesn't work today
**What We'll Leverage**: Existing code, patterns, infrastructure we can reuse

---

## Proposed Architecture
**Diagram**: High-level architecture showing major components and data flow
**Component Overview**: Table of components, their technology, responsibility, scaling strategy

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
- **Auth/Authz**: How users authenticate, what permissions exist
- **Input Validation**: Server-side validation approach
- **Data Protection**: Encryption at rest/transit, PII handling
- **Security Testing**: OWASP checks, dependency scanning

---

## Performance & Scale
- **Targets**: Response time, throughput, uptime SLAs
- **Optimization**: Caching strategy, database optimization, API efficiency
- **Scaling**: How we scale horizontally/vertically, bottlenecks and mitigation

---

## Error Handling & Reliability
- **Error Categories**: User errors (4xx) vs system errors (5xx)
- **Retry Strategy**: When to retry, backoff configuration
- **Fallback Behavior**: What happens when dependencies fail

---

## Monitoring
- **Key Metrics**: Request rate, error rate, latency (with alert thresholds)
- **Logging**: What to log, what NOT to log, retention
- **Dashboards**: Links to system health and feature analytics dashboards
- **Alerts**: Critical vs warning alerts and routing

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

## Implementation Plan
For each phase:
- **Goal**: What we achieve in this phase
- **Tasks**: Key work items
- **Deliverables**: What's shipped
- **Acceptance Criteria**: How we know it's done

---

## Deployment
- **Environments**: Dev, staging, production setup
- **Process**: Automated steps from merge to production
- **Feature Flags**: Gradual rollout strategy
- **Rollback Plan**: When to rollback and how

---

## Database Migrations
For each migration:
- **Forward**: Script to apply changes
- **Rollback**: Script to undo changes
- **Data Migration**: How to backfill/transform existing data
- **Validation**: How to verify success

---

## Operations & Runbook
- **Common Operations**: Scaling, cache clearing, etc.
- **Incident Response**: Symptoms, likely causes, first steps

---

## Dependencies & Risks
- **External Dependencies**: Services we rely on, SLAs, fallback strategies
- **Technical Risks**: Risk | Impact | Likelihood | Mitigation
- **Timeline Risks**: Critical path items, mitigation strategies

---

## Documentation
- [ ] API docs (OpenAPI/Swagger)
- [ ] Architecture diagrams
- [ ] Runbook for on-call
- [ ] Developer guide
```
