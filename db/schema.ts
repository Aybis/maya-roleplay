import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  defaultFlowVisibility: text("default_flow_visibility").notNull().default("public"), // "public" | "private" -- preselected when creating a new flow
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256 hash of the session token, never the raw token
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: integer("expires_at").notNull(), // epoch ms
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const usageEvents = sqliteTable("usage_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // e.g. "voice-token", "tts"
  createdAt: integer("created_at").notNull(), // epoch ms
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
});

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    userId: text("user_id").notNull().references(() => users.id),
    role: text("role").notNull().default("owner"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_idx").on(table.userId),
  ],
);

export const flows = sqliteTable("flows", {
  id: text("id").primaryKey(),
  createdBy: text("created_by").notNull().references(() => users.id),
  workspaceId: text("workspace_id").references(() => workspaces.id),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  category: text("category").notNull().default("custom"),
  persona: text("persona").notNull(), // user-authored system prompt, wrapped in a fixed safety preamble at connect time
  kickoffCue: text("kickoff_cue").notNull().default(""),
  quickActions: text("quick_actions").notNull().default("[]"), // JSON: Array<{ label: string; prompt: string }>
  knowledgeBase: text("knowledge_base").notNull().default("[]"), // JSON: Array<{ question: string; answer: string }>
  steps: text("steps").notNull().default("[]"), // JSON: Array<FlowStep> -- see lib/flows/steps.ts
  starterLine: text("starter_line").notNull().default(""),
  visibility: text("visibility").notNull().default("public"), // "public" | "private"
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const flowVersions = sqliteTable(
  "flow_versions",
  {
    id: text("id").primaryKey(),
    flowId: text("flow_id").notNull().references(() => flows.id),
    version: integer("version").notNull(),
    status: text("status").notNull(), // "draft" | "published"
    schemaVersion: integer("schema_version").notNull().default(1),
    definition: text("definition").notNull(),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: integer("created_at").notNull(),
    publishedAt: integer("published_at"),
  },
  (table) => [
    uniqueIndex("flow_versions_flow_version_unique").on(table.flowId, table.version),
    index("flow_versions_status_idx").on(table.flowId, table.status),
  ],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    displayName: text("display_name").notNull().default("Test customer"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("contacts_workspace_idx").on(table.workspaceId)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    flowId: text("flow_id").notNull().references(() => flows.id),
    contactId: text("contact_id").notNull().references(() => contacts.id),
    createdBy: text("created_by").notNull().references(() => users.id),
    channel: text("channel").notNull().default("test"),
    status: text("status").notNull().default("active"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("conversations_workspace_idx").on(table.workspaceId),
    index("conversations_flow_idx").on(table.flowId),
  ],
);

export const conversationMessages = sqliteTable(
  "conversation_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("conversation_messages_idempotency_unique").on(table.conversationId, table.idempotencyKey),
    index("conversation_messages_order_idx").on(table.conversationId, table.createdAt),
  ],
);

export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    flowVersionId: text("flow_version_id").notNull().references(() => flowVersions.id),
    status: text("status").notNull(),
    outcome: text("outcome"),
    error: text("error"),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [index("executions_conversation_idx").on(table.conversationId)],
);

export const runtimeSessions = sqliteTable(
  "runtime_sessions",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    executionId: text("execution_id").notNull().references(() => executions.id),
    flowVersionId: text("flow_version_id").notNull().references(() => flowVersions.id),
    status: text("status").notNull(),
    currentNodeId: text("current_node_id"),
    variables: text("variables").notNull().default("{}"),
    waitingFor: text("waiting_for"),
    revision: integer("revision").notNull().default(0),
    outcome: text("outcome"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("runtime_sessions_conversation_unique").on(table.conversationId),
    index("runtime_sessions_execution_idx").on(table.executionId),
  ],
);

export const nodeExecutions = sqliteTable(
  "node_executions",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executions.id),
    nodeId: text("node_id").notNull(),
    nodeType: text("node_type").notNull(),
    status: text("status").notNull(),
    input: text("input"),
    output: text("output"),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("node_executions_execution_idx").on(table.executionId, table.createdAt)],
);

export const toolInvocations = sqliteTable(
  "tool_invocations",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executions.id),
    nodeId: text("node_id").notNull(),
    toolName: text("tool_name").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    input: text("input").notNull(),
    output: text("output"),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [uniqueIndex("tool_invocations_idempotency_unique").on(table.idempotencyKey)],
);

export const serviceBookings = sqliteTable(
  "service_bookings",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    vehicleModel: text("vehicle_model").notNull(),
    licensePlate: text("license_plate").notNull(),
    serviceNeeded: text("service_needed").notNull(),
    preferredDate: text("preferred_date").notNull(),
    status: text("status").notNull().default("created"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("service_bookings_conversation_unique").on(table.conversationId),
    index("service_bookings_workspace_idx").on(table.workspaceId, table.createdAt),
  ],
);
