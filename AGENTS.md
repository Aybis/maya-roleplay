# AGENTS.md — Maya Engineering Instructions

## Mission

Enhance this repository into a conversation-native workflow platform while preserving working product behavior.

The product context is documented in:

- `docs/MAYA_PRODUCT_CONTEXT.md`

Read that file before making architectural or product decisions.

## Operating Rules

1. Inspect the repository before proposing implementation.
2. Do not perform a full rewrite unless explicitly approved.
3. Prefer incremental, reviewable changes.
4. Preserve existing user-facing behavior unless the task requires a deliberate change.
5. Separate the headless flow runtime from the visual canvas.
6. Keep core business flows independent from channel-specific rendering.
7. Keep character animation independent from transaction logic.
8. Use deterministic logic for business transactions and constrained AI for interpretation or flexible conversation.
9. Never let an LLM directly control raw Live2D parameters or execute arbitrary external actions.
10. Treat external actions as allow-listed tools with validation, authorization, timeout, retry, and audit logging.
11. Protect credentials and personally identifiable information.
12. Add or update tests for material behavior changes.
13. Run relevant linting, type checks, tests, and builds before reporting completion.
14. Report uncertainty, unresolved risks, and assumptions explicitly.
15. Avoid dependency additions unless they provide clear value and fit the existing stack.

## Required First Task

Before editing implementation code:

1. Inventory the repository structure.
2. Identify the stack and deployment model.
3. Trace the existing flow-builder path from UI to persistence and execution.
4. Identify existing models for user, organization, workspace, agent, flow, node, conversation, and session.
5. Identify current API boundaries and external services.
6. Run the existing validation commands.
7. Produce a concise architecture assessment.
8. Recommend the smallest safe implementation slice.

Do not begin a broad refactor before this assessment is reviewed.

## Architecture Direction

Target layers:

```text
Channel adapters
    -> Channel gateway and normalization
    -> Conversation/session runtime
    -> Flow orchestrator
    -> AI and approved tool layer
    -> Integrations
    -> Observability and governance
    -> Optional character behavior protocol
```

## Flow Runtime Requirements

The runtime should progressively support:

- stable versioned flow definitions;
- persisted sessions;
- wait and resume;
- deterministic node execution;
- retries and timeout handling;
- idempotency;
- per-conversation ordering;
- reusable subflows;
- error and fallback branches;
- node-level execution traces;
- draft and published versions;
- explicit business outcomes.

## Quality Gates

A feature is not complete unless:

- acceptance criteria are met;
- relevant tests pass;
- type checks and lint checks pass;
- error states are handled;
- logs are actionable;
- migration implications are documented;
- security and tenant isolation are considered;
- the change is reviewable in a focused diff.

## Reporting Format

For each task, report:

1. What was inspected
2. What changed
3. Why this approach was selected
4. Files modified
5. Tests and commands run
6. Results
7. Risks or remaining gaps
8. Recommended next task
