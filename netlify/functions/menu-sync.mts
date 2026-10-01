import { syncMenusToDb } from "../../artifacts/api-server/src/lib/zss-as-sync";

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

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  if (!weekdays.includes(weekday ?? "") || hour !== "07") {
    console.log(
      `MealPulse menu sync skipped — Prague time: ${weekday} ${hour}:00`,
    );
    return;
  }

  console.log("MealPulse menu sync started.");

  const result = await syncMenusToDb();

  console.log(`MealPulse menu sync finished: ${result} menu(s) synced.`);
};

export const config = {
  schedule: "0 5,6 * * 1-5",
};
