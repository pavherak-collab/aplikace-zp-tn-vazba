import { parse as parseHtml } from "node-html-parser";
import { db, menusTable } from "@workspace/db";
import { logger } from "./logger";

export const ZSS_AS_MENU_URL =
  "https://www.zss-as.cz/jidelnicek-tento-tyden";

type MealType = "obed1" | "obed2";

interface ParsedMeal {
  date: string;
  mealType: MealType;
  name: string;
}

const WEEKDAYS = new Set([
  "pondělí",
  "úterý",
  "středa",
  "čtvrtek",
  "pátek",
]);

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCzechDate(raw: string): string | null {
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

  if (!match) return null;

  const [, day, month, year] = match;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getDayInfo(raw: string): {
  weekday: string;
  date: string;
} | null {
  const normalized = normalizeText(raw).toLocaleLowerCase("cs-CZ");

  const weekday = normalized.split(/\s+/)[0];

  if (!WEEKDAYS.has(weekday)) {
    return null;
  }

  const date = parseCzechDate(normalized);

  if (!date) {
    return null;
  }

  return {
    weekday,
    date,
  };
}

function getMealType(raw: string): MealType | null {
  const value = normalizeText(raw);

  if (value === "1") return "obed1";
  if (value === "2") return "obed2";

  return null;
}

function extractMealsFromPage(html: string): ParsedMeal[] {
  const root = parseHtml(html);
  const meals: ParsedMeal[] = [];

  const tables = root.querySelectorAll("table");

  for (const table of tables) {
    const header = table.querySelector("tr th");

    if (!header) continue;

    const headerText = normalizeText(header.text);
    const date = parseCzechDate(
      header.getAttribute("title") ?? headerText,
    );

    if (!date) continue;

    const weekday = headerText
      .toLocaleLowerCase("cs-CZ")
      .split(/\s+/)[0];

    if (!WEEKDAYS.has(weekday)) continue;

    for (const row of table.querySelectorAll("tr")) {
      const mealType = getMealType(
        row.querySelector("th")?.text ?? "",
      );

      if (!mealType) continue;

      const category = normalizeText(
        row.querySelector("small")?.text ?? "",
      ).toLocaleLowerCase("cs-CZ");

      if (category !== "hlavní jídlo") continue;

      const cells = row.querySelectorAll("td");

      const name = normalizeText(
        cells.at(-1)?.text ?? "",
      );

      if (!name) continue;

      meals.push({
        date,
        mealType,
        name,
      });
    }
  }

  return meals;
}
export async function fetchZssAsMenu(): Promise<ParsedMeal[]> {
  logger.info(
    { url: ZSS_AS_MENU_URL },
    "Fetching menu from ZŠS Aš",
  );

  const response = await fetch(ZSS_AS_MENU_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MealPulse/1.0)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "cs,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `ZŠS Aš responded with HTTP ${response.status}`,
    );
  }

  const html = await response.text();

  if (!html.trim()) {
    throw new Error("ZŠS Aš returned an empty response");
  }

  const meals = extractMealsFromPage(html);

  if (meals.length === 0) {
    throw new Error(
      "Na stránce ZŠS Aš nebyly nalezeny žádné obědy",
    );
  }

  logger.info(
    { count: meals.length },
    "Parsed meals from ZŠS Aš",
  );

  return meals;
}

export async function syncMenusToDb(
  weekOffset = 0,
): Promise<number> {
  if (weekOffset !== 0) {
    throw new Error(
      "Zdroj ZŠS Aš podporuje pouze aktuální týden",
    );
  }

  const meals = await fetchZssAsMenu();

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

  logger.info(
    { synced },
    "Synced ZŠS Aš menus to DB",
  );

  return synced;
}
