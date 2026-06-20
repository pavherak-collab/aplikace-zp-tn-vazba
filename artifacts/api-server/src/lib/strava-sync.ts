import { parse as parseHtml } from "node-html-parser";
import { db, menusTable, syncLogsTable } from "@workspace/db";
import { logger } from "./logger";

const STRAVA_CANTEEN_ID = 1328;
const STRAVA_URL = `https://app.strava.cz/jidelnicky/${STRAVA_CANTEEN_ID}`;

interface ParsedMeal {
  date: string; // YYYY-MM-DD
  mealType: "obed1" | "obed2";
  name: string;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseCzechDate(raw: string): string | null {
  // Matches patterns like "Pondělí 23.6.2025" or "23.6.2025"
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export async function fetchStravaMenu(weekOffset = 0): Promise<ParsedMeal[]> {
  const url = weekOffset === 0 ? STRAVA_URL : `${STRAVA_URL}?week=${weekOffset}`;
  logger.info({ url }, "Fetching Strava.cz menu");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SchoolLunchApp/1.0)",
      "Accept-Language": "cs,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Strava.cz responded with HTTP ${response.status}`);
  }

  const html = await response.text();
  const root = parseHtml(html);
  const meals: ParsedMeal[] = [];

  // Strava.cz uses a table structure with tr.hl (header) and tr.item rows
  // Each day has a header row with the date, followed by meal rows
  // Try multiple selector strategies for robustness

  // Strategy 1: look for .jidelnicek table rows
  let currentDate: string | null = null;
  const rows = root.querySelectorAll("tr");

  for (const row of rows) {
    const cls = row.classNames;

    // Date header row
    if (cls.includes("hl") || row.querySelector("th")) {
      const text = row.text.trim();
      const parsed = parseCzechDate(text);
      if (parsed) currentDate = parsed;
      continue;
    }

    // Meal item row — look for oběd/lunch items
    if (!currentDate) continue;

    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    // The first meaningful cell often has the meal type/number
    // The second has the meal name
    const typeCell = cells[0]?.text?.trim() ?? "";
    const nameCell = cells[1]?.text?.trim() ?? cells[0]?.text?.trim() ?? "";

    const typeLower = typeCell.toLowerCase();

    let mealType: "obed1" | "obed2" | null = null;
    if (typeLower.includes("oběd 1") || typeLower.includes("obed 1") || typeLower === "1") {
      mealType = "obed1";
    } else if (typeLower.includes("oběd 2") || typeLower.includes("obed 2") || typeLower === "2") {
      mealType = "obed2";
    }

    // Try reading the full row text for meal type if not found in first cell
    if (!mealType) {
      const rowText = row.text;
      if (/ob[eě]d\s*1/i.test(rowText)) mealType = "obed1";
      else if (/ob[eě]d\s*2/i.test(rowText)) mealType = "obed2";
    }

    if (mealType && nameCell && nameCell.length > 2) {
      meals.push({ date: currentDate, mealType, name: nameCell });
    }
  }

  // Strategy 2: alternative div-based layout
  if (meals.length === 0) {
    const dayDivs = root.querySelectorAll(".den, .day, [class*='day'], [class*='den']");
    for (const dayDiv of dayDivs) {
      const dateText = dayDiv.querySelector(".datum, .date, h3, h4")?.text ?? "";
      const parsed = parseCzechDate(dateText);
      if (!parsed) continue;

      const mealDivs = dayDiv.querySelectorAll(".jidlo, .meal, .polozka, [class*='jidlo'], [class*='meal']");
      let idx = 0;
      for (const mealDiv of mealDivs) {
        const name = mealDiv.text.trim();
        if (!name || name.length < 3) continue;
        const mealType: "obed1" | "obed2" = idx === 0 ? "obed1" : "obed2";
        meals.push({ date: parsed, mealType, name });
        idx++;
        if (idx >= 2) break;
      }
    }
  }

  logger.info({ count: meals.length }, "Parsed meals from Strava.cz");
  return meals;
}

export async function syncMenusToDb(weekOffset = 0): Promise<number> {
  const meals = await fetchStravaMenu(weekOffset);
  if (meals.length === 0) return 0;

  let synced = 0;
  for (const meal of meals) {
    await db
      .insert(menusTable)
      .values({
        date: meal.date,
        mealType: meal.mealType,
        name: meal.name,
      })
      .onConflictDoUpdate({
        target: [menusTable.date, menusTable.mealType],
        set: {
          name: meal.name,
          syncedAt: new Date(),
        },
      });
    synced++;
  }

  logger.info({ synced }, "Synced menus to DB");
  return synced;
}

export async function getTodayMenus() {
  const today = toIsoDate(new Date());
  return getMenusForDate(today);
}

export async function getMenusForDate(date: string) {
  const { eq } = await import("drizzle-orm");
  return db.select().from(menusTable).where(eq(menusTable.date, date));
}
