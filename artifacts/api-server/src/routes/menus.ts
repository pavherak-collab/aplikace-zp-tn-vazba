import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, menusTable, syncLogsTable } from "@workspace/db";
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

router.get("/menus/sync-log", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(syncLogsTable)
    .orderBy(desc(syncLogsTable.triggeredAt))
    .limit(10);

  res.json(
    rows.map((r) => ({
      id: r.id,
      triggeredAt: r.triggeredAt.toISOString(),
      source: r.source,
      synced: r.synced,
      error: r.error ?? null,
    }))
  );
});

router.post("/menus/sync", async (req, res): Promise<void> => {
  let synced = 0;
  let errorMsg: string | null = null;

  try {
    synced = await syncMenusToDb();
  } catch (err) {
    req.log.error({ err }, "Menu sync failed");
    errorMsg = (err as Error).message;
  }

  await db.insert(syncLogsTable).values({
    source: "strava",
    synced,
    error: errorMsg,
  });

  if (errorMsg) {
    res.status(502).json({ synced: 0, message: `Synchronizace selhala: ${errorMsg}` });
    return;
  }

  res.json({ synced, message: `Načteno ${synced} pokrmů ze Strava.cz` });
});

router.post("/menus/upsert", async (req, res): Promise<void> => {
  const { date, mealType, name } = req.body as { date: string; mealType: string; name: string };

  if (!date || !mealType || !name) {
    res.status(400).json({ error: "date, mealType and name are required" });
    return;
  }

  const [row] = await db
    .insert(menusTable)
    .values({ date, mealType, name })
    .onConflictDoUpdate({
      target: [menusTable.date, menusTable.mealType],
      set: { name, syncedAt: new Date() },
    })
    .returning();

  await db.insert(syncLogsTable).values({
    source: "manual",
    synced: 1,
    error: null,
  });

  res.json({
    id: row.id,
    date: row.date,
    mealType: row.mealType,
    name: row.name,
    syncedAt: row.syncedAt.toISOString(),
  });
});

router.delete("/menus/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const deleted = await db.delete(menusTable).where(eq(menusTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
