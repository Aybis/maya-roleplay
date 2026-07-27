import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const flows = sqliteTable("flows", {
  id: text("id").primaryKey(),
  createdBy: text("created_by").notNull().references(() => users.id),
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
