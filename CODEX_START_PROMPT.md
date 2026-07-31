# Codex Starting Prompt — Maya Repository Assessment

Open and inspect this repository.

Read these files first:

- `AGENTS.md`
- `docs/MAYA_PRODUCT_CONTEXT.md`
- the existing README and project configuration files

Context:

Maya is evolving into a character-driven omnichannel AI conversation and automation platform. The immediate strategic priority is a reliable, versioned, headless flow runtime. The visual builder, omnichannel adapters, AI nodes, and Live2D character layer must build on top of that foundation.

Current lighthouse domain: automotive dealership.

Current business flows include:

- service booking;
- service promotion;
- vehicle promotion;
- spare-part promotion;
- test-drive booking;
- human handoff.

Do not start by rewriting the application or by implementing a visually impressive canvas.

Your first assignment is repository discovery and architecture assessment.

Perform the following:

1. Identify the stack, package manager, database, authentication model, deployment setup, and major modules.
2. Trace the current flow-builder lifecycle:
   - UI creation;
   - flow serialization;
   - persistence;
   - validation;
   - execution;
   - logs or analytics.
3. Identify which required platform entities already exist:
   organization, workspace, agent, channel, flow, flow version, contact, conversation, session, execution, variable, tool, credential, and knowledge base.
4. Run the existing install, lint, type-check, test, and build commands that are safe in the current environment.
5. Describe what is working today and what appears incomplete or fragile.
6. Identify architectural blockers to:
   - persisted wait/resume;
   - versioned flows;
   - deterministic node execution;
   - API actions;
   - channel normalization;
   - execution tracing;
   - future Live2D behavior events.
7. Recommend the smallest vertical slice that proves the runtime foundation.
8. Produce an implementation plan broken into small, reviewable stages.

Deliverables:

- concise repository map;
- current-state architecture diagram;
- gap analysis;
- proposed target boundaries;
- first vertical-slice acceptance criteria;
- ordered implementation backlog;
- files likely to change;
- risks and unresolved questions.

Do not modify implementation code during this first task unless a very small documentation-only adjustment is necessary. Wait for approval after presenting the assessment.
