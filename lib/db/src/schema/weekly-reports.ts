import { pgTable, text, serial, timestamp, date, integer, jsonb } from "drizzle-orm/pg-core";

export interface TopComment {
  text: string;
  count: number;
  meal: string;
}

export interface MealBreakdownItem {
  meal: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export const weeklyReportsTable = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),
  totalFeedback: integer("total_feedback").notNull().default(0),
  positiveCount: integer("positive_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  negativeCount: integer("negative_count").notNull().default(0),
  bestMeal: text("best_meal"),
  worstMeal: text("worst_meal"),
  topComments: jsonb("top_comments").$type<TopComment[]>().notNull().default([]),
  mealBreakdown: jsonb("meal_breakdown").$type<MealBreakdownItem[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WeeklyReport = typeof weeklyReportsTable.$inferSelect;
