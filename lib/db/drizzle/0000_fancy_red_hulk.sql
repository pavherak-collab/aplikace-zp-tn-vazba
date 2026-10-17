-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal" text NOT NULL,
	"rating" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meal_name" text
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"meal_type" text NOT NULL,
	"name" text NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_date_meal_type_unique" UNIQUE("date","meal_type")
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"total_feedback" integer DEFAULT 0 NOT NULL,
	"positive_count" integer DEFAULT 0 NOT NULL,
	"neutral_count" integer DEFAULT 0 NOT NULL,
	"negative_count" integer DEFAULT 0 NOT NULL,
	"best_meal" text,
	"worst_meal" text,
	"top_comments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meal_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reports_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'strava' NOT NULL,
	"synced" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipients" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"week_start" text
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipients" text DEFAULT '' NOT NULL,
	"from_address" text DEFAULT 'noreply@gymnas.cz' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

*/