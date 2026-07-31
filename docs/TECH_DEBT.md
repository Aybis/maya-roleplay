# Maya Technical Debt Register

This register contains deliberately deferred work. Deferral does not mean the item is safe to ignore before broader production use.

| Area | Deferred work | Trigger to address |
|---|---|---|
| PII governance | Define retention, deletion, export, encryption, redaction, consent, and audit requirements for customer messages, traces, and bookings. | Before real dealership/customer data is accepted. |
| Publishing governance | Add role-based publish permissions, approval workflows, environment promotion, and rollback UI. | Before multiple teams share a production workspace. |
| Integrations | Replace the dummy booking store with approved CRM/DMS/calendar adapters, credential management, health checks, retries, timeouts, and reconciliation. | Before a booking is represented as confirmed in an external dealership system. |
| Public flow actions | Rework public-flow authorization so external actions execute under explicit deployment/tool policies rather than the legacy public webhook route. | Before public flows may use real credentials or external actions. |
| Legacy webhooks | Add egress proxying, DNS and redirect validation, timeouts, retry policy, idempotency, workspace authorization, and audit logs; migrate raw URLs to tool references. | Before enabling legacy webhook nodes for business transactions. |
| Authentication | Evaluate Google sign-in or Privy, account linking, MFA, login throttling, recovery, and session revocation. | Before public launch beyond the MVP cohort. |
| Workspace administration | Add organization ownership, workspace switching, invitations, membership removal, and role enforcement. | Before a user needs more than a personal workspace. |
| Runtime privacy | Redact sensitive variables from traces and define field-level access controls. | Before operators beyond the booking creator can inspect executions. |
| Runtime recovery | Add a worker that recovers sessions left in `waiting_for_action` after a process crash. | Before real external tools or asynchronous actions are enabled. |
| Runtime atomicity | Make session state, messages, and node traces one atomic persistence unit across both Turso and D1; add fault-injection and concurrent-request tests. | Before channels can deliver concurrent customer messages or real external actions are enabled. |
| Human handoff | Add inbox, assignment, operator states, SLA timers, transcript access rules, and `handoff_completed`. | After deterministic booking proves reliable. |
| Omnichannel | Add canonical inbound/outbound message schemas, delivery IDs, per-conversation ordering, channel capabilities, and adapters. | After the text test console is stable. |
| Character protocol | Replace UI-local emotion inference with semantic behavior events and an approved Live2D behavior director. | After runtime and channel contracts stabilize. |
| Legal content | Replace placeholders and reconcile the privacy policy with actual processors and persisted data. | Before public production launch. |
