import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, feedbackTable } from "@workspace/db";
import {
  CreateFeedbackBody,
  ListFeedbackQueryParams,
  ListFeedbackResponse,
  GetFeedbackStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = CreateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid feedback body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [feedback] = await db
    .insert(feedbackTable)
    .values({
      meal: parsed.data.meal,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .returning();

  res.status(201).json({
    id: feedback.id,
    meal: feedback.meal,
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
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListFeedbackResponse.parse(result));
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
