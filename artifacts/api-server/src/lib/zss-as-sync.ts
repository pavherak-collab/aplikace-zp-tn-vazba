import { parse as parseHtml } from "node-html-parser";
import { db, menusTable } from "@workspace/db";
import { logger } from "./logger";

export const ZSS_AS_MENU_URL = "https://www.zss-as.cz/jidelnicek-tento-tyden";

type MealType = "obed1" | "obed2";

interface ParsedMeal {
  date: string;
  mealType: MealType;
  name: string;
}

const WEEKDAYS = new Set(["pondělí", "úterý", "středa", "čtvrtek", "pátek"]);

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseCzechDate(raw: string): string | null {
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getWeekday(raw: string): string | null {
  const weekday = normalizeText(raw).toLocaleLowerCase("cs-CZ").split(/\s+/)[0];
  return WEEKDAYS.has(weekday) ? weekday : null;
}

function getMealType(raw: string): MealType | null {
  const value = normalizeText(raw).toLowerCase();
  if (value === "1") return "obed1";
  if (value === "2") return "obed2";
  return null;
}

function parseDayTable(table: ReturnType<ReturnType<typeof parseHtml>["querySelectorAll"]>[number]): ParsedMeal[] {
  const header = table.querySelector("tr th");
  const headerText = normalizeText(header?.text ?? "");
  if (!getWeekday(headerText)) return [];

  const date = parseCzechDate(header?.getAttribute("title") ?? headerText);
  if (!date) return [];

  const meals: Record<MealType, string> = { obed1: "", obed2: "" };

  for (const row of table.querySelectorAll("tr")) {
    const mealType = getMealType(row.querySelector("th")?.text ?? "");
    if (!mealType) continue;

    const category = normalizeText(row.querySelector("small")?.text ?? "").toLocaleLowerCase("cs-CZ");
    if (category !== "hlavní jídlo") continue;

    const cells = row.querySelectorAll("td");
    meals[mealType] = normalizeText(cells.at(-1)?.text ?? "");
  }

  return (Object.keys(meals) as MealType[]).map((mealType) => ({
    date,
    mealType,
    name: meals[mealType],
  }));
}

export async function fetchZssAsMenu(): Promise<ParsedMeal[]> {
  logger.info({ url: ZSS_AS_MENU_URL }, "Fetching menu from ZŠS Aš");

  const response = await fetch(ZSS_AS_MENU_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SchoolLunchApp/1.0)",
      "Accept-Language": "cs,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`ZŠS Aš responded with HTTP ${response.status}`);
  }

  const html = await response.text();
  const root = parseHtml(html);
  const meals = root
    .querySelectorAll("table.styled")
    .flatMap((table) => parseDayTable(table));

  if (meals.length === 0) {
    throw new Error("Na stránce ZŠS Aš nebyly nalezeny pracovní dny s jídelníčkem");
  }

  logger.info({ count: meals.length }, "Parsed meals from ZŠS Aš");
  return meals;
}

export async function syncMenusToDb(weekOffset = 0): Promise<number> {
  if (weekOffset !== 0) {
    throw new Error("Zdroj ZŠS Aš podporuje pouze aktuální týden");
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

  logger.info({ synced }, "Synced ZŠS Aš menus to DB");
  return synced;
}