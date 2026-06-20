import { pgTable, text, serial, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menusTable = pgTable(
  "menus",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    mealType: text("meal_type").notNull(),
    name: text("name").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("menus_date_meal_type_unique").on(t.date, t.mealType)]
);

export const insertMenuSchema = createInsertSchema(menusTable).omit({ id: true, syncedAt: true });
export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menusTable.$inferSelect;
