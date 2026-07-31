CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`display_name` text DEFAULT 'Test customer' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contacts_workspace_idx` ON `contacts` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_messages_idempotency_unique` ON `conversation_messages` (`conversation_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `conversation_messages_order_idx` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`flow_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`created_by` text NOT NULL,
	`channel` text DEFAULT 'test' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `conversations_workspace_idx` ON `conversations` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `conversations_flow_idx` ON `conversations` (`flow_id`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`flow_version_id` text NOT NULL,
	`status` text NOT NULL,
	`outcome` text,
	`error` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flow_version_id`) REFERENCES `flow_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `executions_conversation_idx` ON `executions` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `flow_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`definition` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flow_versions_flow_version_unique` ON `flow_versions` (`flow_id`,`version`);--> statement-breakpoint
CREATE INDEX `flow_versions_status_idx` ON `flow_versions` (`flow_id`,`status`);--> statement-breakpoint
CREATE TABLE `node_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`node_id` text NOT NULL,
	`node_type` text NOT NULL,
	`status` text NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `node_executions_execution_idx` ON `node_executions` (`execution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `runtime_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`flow_version_id` text NOT NULL,
	`status` text NOT NULL,
	`current_node_id` text,
	`variables` text DEFAULT '{}' NOT NULL,
	`waiting_for` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`outcome` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`flow_version_id`) REFERENCES `flow_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtime_sessions_conversation_unique` ON `runtime_sessions` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `runtime_sessions_execution_idx` ON `runtime_sessions` (`execution_id`);--> statement-breakpoint
CREATE TABLE `service_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`license_plate` text NOT NULL,
	`service_needed` text NOT NULL,
	`preferred_date` text NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_bookings_conversation_unique` ON `service_bookings` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `service_bookings_workspace_idx` ON `service_bookings` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tool_invocations` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`node_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`error` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_invocations_idempotency_unique` ON `tool_invocations` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `user_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_members_user_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `flows` ADD `workspace_id` text REFERENCES workspaces(id);