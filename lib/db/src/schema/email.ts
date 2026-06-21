import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const emailSettingsTable = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  recipients: text("recipients").notNull().default(""),
  fromAddress: text("from_address").notNull().default("noreply@gymnas.cz"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  recipients: text("recipients").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  weekStart: text("week_start"),
});

export type EmailSettings = typeof emailSettingsTable.$inferSelect;
export type EmailLog = typeof emailLogsTable.$inferSelect;
