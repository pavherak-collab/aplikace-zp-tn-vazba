import { generateAndStoreWeeklyReport } from "../../artifacts/api-server/src/lib/report-generator";
import { sendWeeklyReportEmail } from "../../artifacts/api-server/src/lib/email-service";
import { db, emailSettingsTable } from "@workspace/db";

export default async () => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;

  if (weekday !== "Mon" || hour !== "06") {
    console.log(
      `MealPulse weekly report skipped — Prague time: ${weekday} ${hour}:00`,
    );
    return;
  }

  console.log("MealPulse weekly report started.");

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const report = await generateAndStoreWeeklyReport(lastWeek);

  console.log("MealPulse weekly report generated.");

  const [settings] = await db
    .select()
    .from(emailSettingsTable)
    .limit(1);

  if (!settings?.enabled || !settings.recipients.trim()) {
    console.log("MealPulse weekly report email skipped — email is disabled or no recipients are configured.");
    return;
  }

  console.log("MealPulse weekly report email sending...");

  const result = await sendWeeklyReportEmail(report);

  if (!result.success) {
    throw new Error(result.error || "Weekly report email failed");
  }

  console.log(`MealPulse weekly report email sent: ${result.message}`);
};

export const config = {
  schedule: "0 4,5 * * 1",
};
