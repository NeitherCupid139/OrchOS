CREATE TABLE `local_agent_pairings` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_agent_pairings_token_unique` ON `local_agent_pairings` (`token`);--> statement-breakpoint
CREATE INDEX `idx_local_agent_pairings_user_id` ON `local_agent_pairings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_local_agent_pairings_expires_at` ON `local_agent_pairings` (`expires_at`);--> statement-breakpoint
CREATE TABLE `local_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`host_token` text NOT NULL,
	`platform` text,
	`app_version` text,
	`status` text DEFAULT 'online' NOT NULL,
	`runtimes` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`registered_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_local_agents_user_id` ON `local_agents` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_local_agents_organization_id` ON `local_agents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_local_agents_device_id` ON `local_agents` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_local_agents_last_seen_at` ON `local_agents` (`last_seen_at`);--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
DROP TABLE `artifacts`;--> statement-breakpoint
DROP TABLE `commands`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
DROP TABLE `local_host_pairings`;--> statement-breakpoint
DROP TABLE `local_hosts`;--> statement-breakpoint
DROP TABLE `mcp_servers`;--> statement-breakpoint
DROP TABLE `rules`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
DROP TABLE `states`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`project_id` text,
	`runtime_id` text,
	`archived` text DEFAULT 'false' NOT NULL,
	`deleted` text DEFAULT 'false' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`runtime_id`) REFERENCES `runtimes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_conversations`("id", "title", "project_id", "runtime_id", "archived", "deleted", "created_at", "updated_at") SELECT "id", "title", "project_id", "runtime_id", "archived", "deleted", "created_at", "updated_at" FROM `conversations`;--> statement-breakpoint
DROP TABLE `conversations`;--> statement-breakpoint
ALTER TABLE `__new_conversations` RENAME TO `conversations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX `idx_events_goal_id`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `goal_id`;--> statement-breakpoint
DROP INDEX `idx_problems_goal_id`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `goal_id`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `state_id`;--> statement-breakpoint
ALTER TABLE `bookmark_categories` ADD `icon` text DEFAULT 'folder' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookmark_categories` ADD `color` text;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `icon` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `trace` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `execution_mode` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `sandbox_status` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `sandbox_vm_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `project_name` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `clarification_questions` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `tokens` text;