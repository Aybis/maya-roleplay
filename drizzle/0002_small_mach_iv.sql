CREATE TABLE `flows` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'custom' NOT NULL,
	`persona` text NOT NULL,
	`kickoff_cue` text DEFAULT '' NOT NULL,
	`quick_actions` text DEFAULT '[]' NOT NULL,
	`starter_line` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
