import cron from "node-cron";
import { logger } from "./logger";
import { generateAndStoreWeeklyReport } from "./report-generator";
import { syncMenusToDb } from "./zss-as-sync";
import { sendWeeklyReportEmail } from "./email-service";
import { db, emailSettingsTable } from "@workspace/db";

export function startScheduler() {
  // Generate weekly report every Monday at 06:00, then email it
  cron.schedule(
    "0 6 * * 1",
    async () => {
      logger.info("Scheduler: generating weekly report for previous week");
      try {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const report = await generateAndStoreWeeklyReport(lastWeek);
        logger.info("Scheduler: weekly report generated successfully");

        // Send email if enabled
        const [settings] = await db.select().from(emailSettingsTable).limit(1);
        if (settings?.enabled && settings.recipients.trim()) {
          logger.info("Scheduler: sending weekly report email");
          const result = await sendWeeklyReportEmail(report);
          if (result.success) {
            logger.info({ message: result.message }, "Scheduler: email sent");
          } else {
            logger.error({ error: result.error }, "Scheduler: email send failed");
          }
        }
      } catch (err) {
        logger.error({ err }, "Scheduler: failed to generate weekly report");
      }
    },
    { timezone: "Europe/Prague" }
  );

  // Sync the current week's menu from ZŠS Aš every weekday at 07:00
  cron.schedule(
    "0 7 * * 1-5",
    async () => {
      logger.info("Scheduler: syncing menus from ZŠS Aš");
      try {
        const count = await syncMenusToDb();
        logger.info({ count }, "Scheduler: menu sync complete");
      } catch (err) {
        logger.error({ err }, "Scheduler: failed to sync menus from ZŠS Aš");
      }
    },
    { timezone: "Europe/Prague" }
  );

  logger.info("Scheduler started (weekly report+email: Mon 06:00, menu sync: Mon–Fri 07:00)");
}
