import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, weeklyReportsTable } from "@workspace/db";
import { generateAndStoreWeeklyReport } from "../lib/report-generator";

const router: IRouter = Router();

router.get("/reports/weekly", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(weeklyReportsTable)
    .orderBy(desc(weeklyReportsTable.weekStart));

  res.json(
    rows.map((r) => ({
      id: r.id,
      weekStart: r.weekStart,
      totalFeedback: r.totalFeedback,
      positiveCount: r.positiveCount,
      neutralCount: r.neutralCount,
      negativeCount: r.negativeCount,
      bestMeal: r.bestMeal ?? null,
      worstMeal: r.worstMeal ?? null,
      topComments: r.topComments ?? [],
      mealBreakdown: r.mealBreakdown ?? [],
      generatedAt: r.generatedAt.toISOString(),
    }))
  );
});

router.post("/reports/weekly/generate", async (req, res): Promise<void> => {
  try {
    const report = await generateAndStoreWeeklyReport();
    res.json({
      id: report.id,
      weekStart: report.weekStart,
      totalFeedback: report.totalFeedback,
      positiveCount: report.positiveCount,
      neutralCount: report.neutralCount,
      negativeCount: report.negativeCount,
      bestMeal: report.bestMeal ?? null,
      worstMeal: report.worstMeal ?? null,
      topComments: report.topComments ?? [],
      mealBreakdown: report.mealBreakdown ?? [],
      generatedAt: report.generatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate weekly report");
    res.status(500).json({ error: "Report generation failed" });
  }
});

export default router;
