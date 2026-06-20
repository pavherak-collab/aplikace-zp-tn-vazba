import cron from "node-cron";
import { logger } from "./logger";
import { generateAndStoreWeeklyReport } from "./report-generator";
import { syncMenusToDb } from "./strava-sync";

export function startScheduler() {
  // Generate weekly report every Monday at 06:00
  cron.schedule(
    "0 6 * * 1",
    async () => {
      logger.info("Scheduler: generating weekly report for previous week");
      try {
        // Generate report for the week that just ended (previous Monday → Sunday)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        await generateAndStoreWeeklyReport(lastWeek);
        logger.info("Scheduler: weekly report generated successfully");
      } catch (err) {
        logger.error({ err }, "Scheduler: failed to generate weekly report");
      }
    },
    { timezone: "Europe/Prague" }
  );

  // Sync today's menu from Strava.cz every day at 07:00
  cron.schedule(
    "0 7 * * 1-5",
    async () => {
      logger.info("Scheduler: syncing menus from Strava.cz");
      try {
        const count = await syncMenusToDb();
        logger.info({ count }, "Scheduler: menu sync complete");
      } catch (err) {
        logger.error({ err }, "Scheduler: failed to sync menus from Strava.cz");
      }
    },
    { timezone: "Europe/Prague" }
  );

  logger.info("Scheduler started (weekly report: Mon 06:00, menu sync: Mon–Fri 07:00)");
}
