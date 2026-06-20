import { sql, gte } from "drizzle-orm";
import { db, feedbackTable, weeklyReportsTable } from "@workspace/db";
import type { TopComment, MealBreakdownItem } from "@workspace/db";
import { logger } from "./logger";

function getWeekStart(from?: Date): Date {
  const now = from ?? new Date();
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function extractTopComments(rows: Array<{ meal: string; comment: string | null }>): TopComment[] {
  const counts = new Map<string, { count: number; meal: string }>();
  for (const row of rows) {
    if (!row.comment) continue;
    const normalized = row.comment.trim().toLowerCase();
    if (normalized.length < 3) continue;
    const existing = counts.get(normalized);
    if (existing) {
      existing.count++;
    } else {
      counts.set(normalized, { count: 1, meal: row.meal });
    }
  }

  return Array.from(counts.entries())
    .map(([text, { count, meal }]) => ({ text, count, meal }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function generateAndStoreWeeklyReport(weekFrom?: Date) {
  const weekStart = getWeekStart(weekFrom);
  const weekStartStr = toIsoDate(weekStart);

  logger.info({ weekStart: weekStartStr }, "Generating weekly report");

  const weekRows = await db
    .select()
    .from(feedbackTable)
    .where(gte(feedbackTable.createdAt, weekStart))
    .orderBy(feedbackTable.createdAt);

  const total = weekRows.length;
  const positive = weekRows.filter((r) => r.rating === "positive").length;
  const neutral = weekRows.filter((r) => r.rating === "neutral").length;
  const negative = weekRows.filter((r) => r.rating === "negative").length;

  const mealsInWeek = [...new Set(weekRows.map((r) => r.meal))];
  const mealBreakdown: MealBreakdownItem[] = mealsInWeek.map((meal) => {
    const rows = weekRows.filter((r) => r.meal === meal);
    return {
      meal,
      positive: rows.filter((r) => r.rating === "positive").length,
      neutral: rows.filter((r) => r.rating === "neutral").length,
      negative: rows.filter((r) => r.rating === "negative").length,
      total: rows.length,
    };
  });

  let bestMeal: string | null = null;
  let worstMeal: string | null = null;
  if (mealBreakdown.length > 0) {
    const sorted = [...mealBreakdown].sort(
      (a, b) => b.positive / (b.total || 1) - a.positive / (a.total || 1)
    );
    bestMeal = sorted[0].meal;
    worstMeal = sorted[sorted.length - 1].meal;
    if (bestMeal === worstMeal) worstMeal = null;
  }

  const topComments = extractTopComments(weekRows);

  const [stored] = await db
    .insert(weeklyReportsTable)
    .values({
      weekStart: weekStartStr,
      totalFeedback: total,
      positiveCount: positive,
      neutralCount: neutral,
      negativeCount: negative,
      bestMeal,
      worstMeal,
      topComments,
      mealBreakdown,
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [weeklyReportsTable.weekStart],
      set: {
        totalFeedback: total,
        positiveCount: positive,
        neutralCount: neutral,
        negativeCount: negative,
        bestMeal,
        worstMeal,
        topComments,
        mealBreakdown,
        generatedAt: new Date(),
      },
    })
    .returning();

  logger.info({ id: stored.id, weekStart: weekStartStr, total }, "Weekly report stored");
  return stored;
}
