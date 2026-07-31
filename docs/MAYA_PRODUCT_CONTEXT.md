# Maya Product Context

## 1. Product Vision

Maya is evolving from a roleplay prototype into a **character-driven omnichannel AI conversation and automation platform**.

Core proposition:

> Build AI agents that can communicate naturally, express personality, and execute real business workflows across channels.

Maya should combine:

- the conversational and character experience of AI companion/roleplay products;
- the visual conversation design experience of Voiceflow;
- the orchestration flexibility of n8n;
- domain-specific templates and integrations;
- optional Live2D embodiment for supported interfaces.

Maya is **not** intended to become a general-purpose automation platform or an n8n clone. It should be a **conversation-native workflow engine**.

---

## 2. Current Product Direction

The current lighthouse domain is an automotive dealership.

Initial dealership flows:

1. Service booking
2. Service promotion
3. Vehicle promotion
4. Spare-part promotion
5. Test-drive booking
6. Human handoff to sales or customer service

The dealership is the first vertical used to validate the platform. The architecture must remain reusable for healthcare, retail, banking, cooperatives, property, education, hospitality, and other business domains.

---

## 3. Strategic Priorities

Priority order:

1. Flow definition and execution runtime
2. Test console and observability
3. Visual flow builder
4. Knowledge and AI-assisted routing
5. Channel abstraction and omnichannel deployment
6. Operational inbox and human handoff
7. Character behavior and Live2D integration
8. Additional domains and template marketplace

The visual canvas must not become the foundation. The **headless runtime and stable flow schema** are the foundation.

---

## 4. Product Principles

### 4.1 Build once, deploy across channels

A business flow should be defined once and rendered according to channel capabilities.

Potential channels:

- WhatsApp
- Web chat
- Mobile application
- Instagram
- Facebook Messenger
- Phone or realtime voice
- API
- Dealership kiosk

Do not create separate business logic for every channel unless channel-specific behavior is unavoidable.

### 4.2 Hybrid deterministic and agentic architecture

Use deterministic workflows for transactions that must be reliable:

- creating bookings;
- creating leads;
- changing schedules;
- accessing customer data;
- calling external APIs;
- sending confirmations;
- performing handoff.

Use agentic behavior for:

- understanding natural language;
- intent classification;
- product explanations;
- recommendations;
- knowledge retrieval;
- flexible fallback conversations.

Recommended pattern:

```text
Agentic intent detection
    -> Deterministic transaction flow
    -> Agentic explanation when needed
    -> Deterministic action and confirmation
```

### 4.3 Conversation-native orchestration

Maya workflow nodes should be optimized for conversations, sessions, waiting for replies, channel rendering, customer identity, and business outcomes.

### 4.4 Characters are an experience layer

Character animation must be independent from core business logic.

The same flow should support:

- full Live2D character on web/mobile/kiosk;
- voice-only experience on phone;
- text, media, stickers, or voice notes on WhatsApp;
- structured API output with optional behavior metadata.

---

## 5. Proposed Platform Architecture

```text
CHANNEL EXPERIENCE
WhatsApp | Web | Mobile | Instagram | Phone | API | Kiosk
                         |
                         v
CHANNEL GATEWAY
Authentication | Webhooks | Message normalization
Delivery status | Rate limits | Capability mapping
                         |
                         v
CONVERSATION RUNTIME
Contact | Conversation | Session | State | Variables
Ordering | Retry | Idempotency | Timeout | Human handoff
                         |
                         v
FLOW ORCHESTRATOR
Trigger | Message | Question | Capture | Condition
Intent | Knowledge | AI | API action | Subflow | Delay | End
                |                         |
                v                         v
AI LAYER                          INTEGRATION LAYER
LLM | Intent | Entity            CRM | DMS | Calendar
RAG | Memory | Guardrails        Inventory | Payment | Webhooks
                |                         |
                +------------+------------+
                             |
                             v
OBSERVABILITY AND GOVERNANCE
Logs | Analytics | Versioning | RBAC | Audit trail
Secrets | Cost tracking | Testing | Evaluation
                             |
                             v
OPTIONAL CHARACTER EXPERIENCE
Behavior director | Voice | Live2D renderer | Lip-sync
Emotion | Gesture | Gaze | Animation state machine
```

---

## 6. Core Domain Model

Recommended minimum hierarchy:

```text
Organization
└── Workspace
    ├── Agents
    ├── Channels
    ├── Flows
    ├── Flow Versions
    ├── Contacts
    ├── Conversations
    ├── Sessions
    ├── Executions
    ├── Variables
    ├── Tools
    ├── Credentials
    ├── Knowledge Bases
    └── Integrations
```

Minimum entities:

| Entity | Responsibility |
|---|---|
| Organization | Enterprise or account owner |
| Workspace | Brand, business unit, dealer, or client boundary |
| Agent | Persona, instructions, knowledge, tools, and voice |
| Channel | Deployment and channel credentials |
| Flow | Logical conversation process |
| FlowVersion | Draft, published, rollback, and immutable execution reference |
| Contact | Unified customer identity |
| Conversation | Customer communication thread |
| Session | Active execution state |
| Execution | Runtime trace for a flow or node |
| Variable | Session, contact, workspace, or execution data |
| Tool | Approved callable business action |
| Credential | Encrypted integration secret |
| KnowledgeBase | Domain and company information |

---

## 7. Stable Flow Definition

Flows should be serializable and executable without the visual canvas.

Illustrative schema:

```json
{
  "id": "flow_booking_service",
  "version": 1,
  "status": "draft",
  "entryNodeId": "trigger_new_message",
  "nodes": [],
  "edges": [],
  "variables": [],
  "metadata": {}
}
```

The runtime must support:

- pause while waiting for a user reply;
- resume from persisted state;
- retries and backoff;
- execution timeouts;
- idempotency;
- message ordering per conversation;
- error and fallback paths;
- node-level logs;
- draft and published versions;
- rollback;
- reusable subflows;
- cancellation;
- business outcome tracking.

---

## 8. MVP Node Library

Keep the first version compact and composable.

1. Trigger
2. Send Message
3. Ask Question
4. Capture Data
5. Condition
6. Intent Router
7. Knowledge Answer
8. AI Response
9. API Action
10. Human Handoff
11. Subflow
12. Delay or Wait
13. End

Optional character-aware nodes should initially compile into normal runtime events:

1. Character Speak
2. Set Expression
3. Play Gesture
4. Set Gaze
5. Listen
6. Character React
7. Reset to Idle

Avoid direct low-level control of animation bones or parameters from the LLM.

---

## 9. Dealership Lighthouse Flows

### 9.1 Master routing

```text
Incoming customer message
    -> Resolve customer and conversation
    -> Detect intent
       -> Service booking
       -> Service promotion
       -> Vehicle promotion
       -> Spare-part promotion
       -> Test drive
       -> Human assistance
       -> Knowledge or fallback agent
```

### 9.2 Service booking

```text
Capture customer identity
    -> Capture vehicle or license plate
    -> Select branch
    -> Capture service requirement
    -> Check calendar or DMS availability
    -> Select slot
    -> Create booking
    -> Confirm booking
    -> Schedule reminder
```

### 9.3 Test drive

```text
Select vehicle model
    -> Select variant
    -> Select branch
    -> Check availability
    -> Select date and time
    -> Capture customer details
    -> Create CRM lead
    -> Assign salesperson
    -> Send confirmation
```

### 9.4 Vehicle promotion

```text
Understand customer need
    -> Capture budget
    -> Capture preferred model or category
    -> Retrieve eligible inventory and promotions
    -> Recommend vehicles
    -> Qualify purchase intent
    -> Create lead
    -> Route to salesperson
```

Business outcomes must be explicit:

- booking_created;
- test_drive_scheduled;
- lead_created;
- lead_qualified;
- handoff_completed;
- promotion_viewed;
- customer_abandoned;
- transaction_failed.

---

## 10. Omnichannel Model

Use a canonical inbound message shape before invoking the runtime.

Illustrative shape:

```json
{
  "channel": "whatsapp",
  "workspaceId": "dealer_001",
  "contactId": "contact_123",
  "conversationId": "conversation_456",
  "messageType": "text",
  "content": {
    "text": "Saya ingin booking servis"
  },
  "metadata": {
    "externalMessageId": "external_id",
    "receivedAt": "ISO-8601 timestamp"
  }
}
```

Outbound responses should use channel-neutral content plus optional channel adaptations.

```json
{
  "content": {
    "type": "text",
    "text": "Jadwal test drive berhasil dibuat."
  },
  "behavior": {
    "emotion": "happy",
    "gesture": "small_celebration",
    "voiceStyle": "warm"
  },
  "fallbacks": {
    "whatsapp": {
      "type": "text"
    },
    "phone": {
      "type": "voice"
    }
  }
}
```

---

## 11. Live2D Character Direction

Live2D is the preferred first avatar technology because the current asset is an anime-style 2D character.

Character runtime should be isolated behind an interface such as:

```ts
interface AvatarRenderer {
  loadCharacter(characterId: string): Promise<void>;
  enterState(state: CharacterState): void;
  setExpression(name: string, intensity?: number): void;
  playGesture(name: string, intensity?: number): void;
  setGaze(target: GazeTarget): void;
  updateLipSync(value: number): void;
  stopSpeaking(): void;
}
```

Initial character state machine:

```text
IDLE
  -> LISTENING
  -> THINKING
  -> SPEAKING
  -> REACTING
  -> IDLE
```

Initial expression library:

- neutral
- warm_smile
- cute_smile
- happy
- giggle
- thinking
- surprised
- concerned
- apologetic

Initial gesture library:

- greet
- nod
- shake_head
- head_tilt
- small_wave
- thinking
- small_giggle
- small_celebration

LLM output must be semantic and constrained:

```json
{
  "speech": "Hehe, pilihan kamu menarik juga.",
  "emotion": "giggle",
  "emotionIntensity": 0.6,
  "gesture": "small_giggle",
  "gestureIntensity": 0.5,
  "gaze": "user"
}
```

A behavior director maps this output to approved Live2D motions and parameters.

Character implementation is secondary to the flow runtime. Do not let animation work block the core platform foundation.

---

## 12. Recommended Delivery Phases

### Phase 1 — Runtime foundation

- inspect and document current repository;
- define domain model;
- define stable flow JSON schema;
- implement headless execution engine;
- persist sessions and execution state;
- implement deterministic nodes;
- add test console;
- add execution logs;
- implement one complete dealership flow;
- add basic draft/publish/version behavior.

### Phase 2 — Operational chatbot

- knowledge base;
- intent router;
- controlled AI response node;
- human handoff;
- inbox and assignment;
- analytics;
- reusable subflows;
- scheduled follow-up;
- roles and permissions.

### Phase 3 — Omnichannel

- channel gateway;
- canonical message schema;
- capability-aware renderer;
- web chat;
- WhatsApp;
- unified customer identity;
- cross-channel history.

### Phase 4 — Character layer

- Live2D renderer abstraction;
- idle, listening, thinking, speaking states;
- lip-sync;
- approved expression and gesture library;
- behavior event protocol;
- interruption support;
- character-aware builder nodes.

### Phase 5 — Enterprise and cross-domain leverage

- dev/staging/production environments;
- approvals;
- SSO;
- audit logs;
- secrets management;
- evaluation and QA;
- usage and cost controls;
- domain template packs;
- white-labeling.

---

## 13. Immediate Engineering Goal

The first major engineering outcome should be:

> A dealership flow can be created, tested, published, executed, paused for a customer response, resumed, observed, versioned, and reused without changing application code.

Do not prioritize adding many channels, domains, animations, or AI features until this outcome is reliable.

---

## 14. Open Questions Codex Must Resolve from the Repository

Codex must inspect the actual repository before proposing changes and answer:

1. What framework, runtime, database, and deployment model are currently used?
2. Which modules already represent agents, flows, nodes, sessions, and channels?
3. Is the current flow format persisted or UI-only?
4. How is authentication and tenancy currently handled?
5. What is the safest incremental path without rewriting working functionality?
6. Which parts can be retained, refactored, or isolated?
7. What tests currently exist?
8. What technical debt will block a production-grade execution runtime?
9. What is the smallest vertical slice that proves the architecture?
10. Which external integrations are real versus mocked?

No architectural assumption should override evidence from the repository.
