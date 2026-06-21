import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, emailSettingsTable, emailLogsTable, weeklyReportsTable } from "@workspace/db";
import {
  getOrCreateEmailSettings,
  sendWeeklyReportEmail,
} from "../lib/email-service";

const router: IRouter = Router();

router.get("/email/settings", async (_req, res): Promise<void> => {
  const s = await getOrCreateEmailSettings();
  res.json({
    id: s.id,
    recipients: s.recipients,
    fromAddress: s.fromAddress,
    enabled: s.enabled,
    updatedAt: s.updatedAt.toISOString(),
  });
});

router.put("/email/settings", async (req, res): Promise<void> => {
  const { recipients, fromAddress, enabled } = req.body as {
    recipients?: string;
    fromAddress?: string;
    enabled?: boolean;
  };

  const current = await getOrCreateEmailSettings();

  const [updated] = await db
    .update(emailSettingsTable)
    .set({
      recipients: recipients ?? current.recipients,
      fromAddress: fromAddress ?? current.fromAddress,
      enabled: enabled ?? current.enabled,
      updatedAt: new Date(),
    })
    .where(eq(emailSettingsTable.id, current.id))
    .returning();

  res.json({
    id: updated.id,
    recipients: updated.recipients,
    fromAddress: updated.fromAddress,
    enabled: updated.enabled,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.post("/email/send-test", async (req, res): Promise<void> => {
  const reports = await db
    .select()
    .from(weeklyReportsTable)
    .orderBy(desc(weeklyReportsTable.weekStart))
    .limit(1);

  if (reports.length === 0) {
    res.json({
      success: false,
      message: "Žádný týdenní přehled nenalezen. Nejprve vygenerujte přehled.",
      error: "no_report",
    });
    return;
  }

  const result = await sendWeeklyReportEmail(reports[0], { isTest: true });
  res.json(result);
});

router.post("/email/send-report", async (req, res): Promise<void> => {
  const reports = await db
    .select()
    .from(weeklyReportsTable)
    .orderBy(desc(weeklyReportsTable.weekStart))
    .limit(1);

  if (reports.length === 0) {
    res.json({
      success: false,
      message: "Žádný týdenní přehled nenalezen. Nejprve vygenerujte přehled.",
      error: "no_report",
    });
    return;
  }

  const result = await sendWeeklyReportEmail(reports[0]);
  res.json(result);
});

router.get("/email/logs", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(emailLogsTable)
    .orderBy(desc(emailLogsTable.sentAt))
    .limit(20);

  res.json(
    rows.map((r) => ({
      id: r.id,
      sentAt: r.sentAt.toISOString(),
      recipients: r.recipients,
      status: r.status,
      error: r.error ?? null,
      weekStart: r.weekStart ?? null,
    }))
  );
});

export default router;
