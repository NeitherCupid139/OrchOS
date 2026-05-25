CREATE TABLE `credit_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`tokens` text DEFAULT '0' NOT NULL,
	`credits` text DEFAULT '0' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_usage_user_id` ON `credit_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_credit_usage_action` ON `credit_usage` (`action`);--> statement-breakpoint
CREATE INDEX `idx_credit_usage_created_at` ON `credit_usage` (`created_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`credits_balance` text DEFAULT '0' NOT NULL,
	`credits_total` text DEFAULT '0' NOT NULL,
	`tokens_used` text DEFAULT '0' NOT NULL,
	`period_start` text,
	`period_end` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
