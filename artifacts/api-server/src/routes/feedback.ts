import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, feedbackTable, menusTable } from "@workspace/db";
import {
  CreateFeedbackBody,
  ListFeedbackQueryParams,
  ListFeedbackResponse,
  GetFeedbackStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getPragueDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = CreateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid feedback body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [menu] = await db
    .select({ name: menusTable.name })
    .from(menusTable)
    .where(and(eq(menusTable.date, getPragueDate()), eq(menusTable.mealType, parsed.data.meal)))
    .limit(1);

  const [feedback] = await db
    .insert(feedbackTable)
    .values({
      meal: parsed.data.meal,
      mealName: menu?.name ?? null,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .returning();

  res.status(201).json({
    id: feedback.id,
    meal: feedback.meal,
    mealName: feedback.mealName ?? null,
    rating: feedback.rating,
    comment: feedback.comment ?? null,
    createdAt: feedback.createdAt.toISOString(),
  });
});

router.get("/feedback", async (req, res): Promise<void> => {
  const params = ListFeedbackQueryParams.safeParse(req.query);
  if (!params.success) {
    req.log.warn({ errors: params.error.message }, "Invalid query params");
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(feedbackTable).$dynamic();

  if (params.data.meal) {
    query = query.where(eq(feedbackTable.meal, params.data.meal));
  }

  const rows = await query.orderBy(feedbackTable.createdAt);

  const result = rows.map((r) => ({
    id: r.id,
    meal: r.meal,
    mealName: r.mealName ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListFeedbackResponse.parse(result));
});

router.get("/feedback/weekly-report", async (req, res): Promise<void> => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekRows = await db
    .select()
    .from(feedbackTable)
    .where(sql`${feedbackTable.createdAt} >= ${weekStart}`)
    .orderBy(feedbackTable.createdAt);

  const total = weekRows.length;
  const positive = weekRows.filter((r) => r.rating === "positive").length;
  const neutral = weekRows.filter((r) => r.rating === "neutral").length;
  const negative = weekRows.filter((r) => r.rating === "negative").length;

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  // Meal breakdown for this week
  const mealsInWeek = [...new Set(weekRows.map((r) => r.meal))];
  const mealBreakdown = mealsInWeek.map((meal) => {
    const rows = weekRows.filter((r) => r.meal === meal);
    return {
      meal,
      positive: rows.filter((r) => r.rating === "positive").length,
      neutral: rows.filter((r) => r.rating === "neutral").length,
      negative: rows.filter((r) => r.rating === "negative").length,
      total: rows.length,
    };
  });

  // Best meal = highest positive ratio; worst = highest negative ratio
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

  // Recent comments (up to 5, most recent first)
  const recentComments = weekRows
    .filter((r) => r.comment)
    .reverse()
    .slice(0, 5)
    .map((r) => ({
      meal: r.meal,
      mealName: r.mealName ?? null,
      rating: r.rating,
      comment: r.comment!,
      createdAt: r.createdAt.toISOString(),
    }));

  res.json({
    totalThisWeek: total,
    positivePercent: pct(positive),
    neutralPercent: pct(neutral),
    negativePercent: pct(negative),
    bestMeal,
    worstMeal,
    recentComments,
    mealBreakdown,
  });
});

router.get("/feedback/stats", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      meal: feedbackTable.meal,
      positive: sql<number>`cast(count(*) filter (where ${feedbackTable.rating} = 'positive') as int)`,
      neutral: sql<number>`cast(count(*) filter (where ${feedbackTable.rating} = 'neutral') as int)`,
      negative: sql<number>`cast(count(*) filter (where ${feedbackTable.rating} = 'negative') as int)`,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(feedbackTable)
    .groupBy(feedbackTable.meal)
    .orderBy(feedbackTable.meal);

  res.json(GetFeedbackStatsResponse.parse(rows));
});

export default router;
