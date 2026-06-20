import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, menusTable } from "@workspace/db";
import { syncMenusToDb } from "../lib/strava-sync";

const router: IRouter = Router();

router.get("/menus", async (req, res): Promise<void> => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : null;
  const date = dateParam ?? new Date().toISOString().split("T")[0];

  const rows = await db.select().from(menusTable).where(eq(menusTable.date, date));

  res.json(
    rows.map((r) => ({
      id: r.id,
      date: r.date,
      mealType: r.mealType,
      name: r.name,
      syncedAt: r.syncedAt.toISOString(),
    }))
  );
});

router.post("/menus/sync", async (req, res): Promise<void> => {
  try {
    const synced = await syncMenusToDb();
    res.json({ synced, message: `Synced ${synced} menu items from Strava.cz` });
  } catch (err) {
    req.log.error({ err }, "Menu sync failed");
    res.status(502).json({ synced: 0, message: `Sync failed: ${(err as Error).message}` });
  }
});

export default router;
