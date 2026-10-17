import { pgTable, serial, text, timestamp, unique, date, integer, jsonb, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const feedback = pgTable("feedback", {
	id: serial().primaryKey().notNull(),
	meal: text().notNull(),
	rating: text().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	mealName: text("meal_name"),
});

export const menus = pgTable("menus", {
	id: serial().primaryKey().notNull(),
	date: date().notNull(),
	mealType: text("meal_type").notNull(),
	name: text().notNull(),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("menus_date_meal_type_unique").on(table.date, table.mealType),
]);

export const weeklyReports = pgTable("weekly_reports", {
	id: serial().primaryKey().notNull(),
	weekStart: date("week_start").notNull(),
	totalFeedback: integer("total_feedback").default(0).notNull(),
	positiveCount: integer("positive_count").default(0).notNull(),
	neutralCount: integer("neutral_count").default(0).notNull(),
	negativeCount: integer("negative_count").default(0).notNull(),
	bestMeal: text("best_meal"),
	worstMeal: text("worst_meal"),
	topComments: jsonb("top_comments").default([]).notNull(),
	mealBreakdown: jsonb("meal_breakdown").default([]).notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("weekly_reports_week_start_unique").on(table.weekStart),
]);

export const syncLogs = pgTable("sync_logs", {
	id: serial().primaryKey().notNull(),
	triggeredAt: timestamp("triggered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	source: text().default('strava').notNull(),
	synced: integer().default(0).notNull(),
	error: text(),
});

export const emailLogs = pgTable("email_logs", {
	id: serial().primaryKey().notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	recipients: text().notNull(),
	status: text().notNull(),
	error: text(),
	weekStart: text("week_start"),
});

export const emailSettings = pgTable("email_settings", {
	id: serial().primaryKey().notNull(),
	recipients: text().default(').notNull(),
	fromAddress: text("from_address").default('noreply@gymnas.cz').notNull(),
	enabled: boolean().default(false).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
