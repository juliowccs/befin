CREATE TABLE `banks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`balance_cents` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `banks_updated_at_idx` ON `banks` (`updated_at`);--> statement-breakpoint
CREATE TABLE `envelopes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`is_emergency_fund` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `envelopes_updated_at_idx` ON `envelopes` (`updated_at`);--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`expected_cents` integer NOT NULL,
	`actual_cents` integer NOT NULL,
	`yield_cents` integer NOT NULL,
	`discrepancy_cents` integer NOT NULL,
	`notes` text,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `reconciliations_updated_at_idx` ON `reconciliations` (`updated_at`);--> statement-breakpoint
CREATE TABLE `third_parties` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `third_parties_updated_at_idx` ON `third_parties` (`updated_at`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`payment_method` text NOT NULL,
	`status` text NOT NULL,
	`from_envelope_id` text,
	`to_envelope_id` text,
	`third_party_id` text,
	`bank_id` text,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `transactions_updated_at_idx` ON `transactions` (`updated_at`);