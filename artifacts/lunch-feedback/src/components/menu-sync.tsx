import { useState } from "react";
import {
  useSyncMenus,
  useGetMenus,
  useGetMenusSyncLog,
  useUpsertMenu,
  useDeleteMenu,
  getGetMenusQueryKey,
  getGetMenusSyncLogQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Utensils, CheckCircle2, AlertCircle, Clock,
  ChevronDown, ChevronUp, PlusCircle, Trash2, Pencil, XCircle, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const getMealLabel = (type: string) => (type === "obed1" ? "Oběd 1" : "Oběd 2");

const today = () => new Date().toISOString().split("T")[0];

interface EntryForm {
  date: string;
  mealType: "obed1" | "obed2";
  name: string;
}

const EMPTY_FORM: EntryForm = { date: today(), mealType: "obed1", name: "" };

export default function MenuSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const todayStr = today();
  const { data: todayMenus, isLoading: isLoadingMenu } = useGetMenus({ date: todayStr });
  const { data: syncLog } = useGetMenusSyncLog();
  const syncMenus = useSyncMenus();
  const upsertMenu = useUpsertMenu();
  const deleteMenu = useDeleteMenu();

  const [menuExpanded, setMenuExpanded] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const hasTodayMenu = todayMenus && todayMenus.length > 0;
  const lastLog = syncLog?.[0];
  const lastSuccess = syncLog?.find((l) => !l.error);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetMenusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMenusSyncLogQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
  }

  function handleSync() {
    syncMenus.mutate(undefined, {
      onSuccess: (data) => {
        invalidate();
        toast({
          title: "Synchronizace dokončena",
          description: data.message,
        });
      },
      onError: () => {
        invalidate();
        toast({
          title: "Chyba synchronizace",
          description: "Strava.cz není dostupná. Zadejte jídelníček ručně.",
          variant: "destructive",
        });
      },
    });
  }

  function handleUpsert() {
    if (!form.name.trim()) return;
    upsertMenu.mutate(
      { data: { date: form.date, mealType: form.mealType, name: form.name.trim() } },
      {
        onSuccess: () => {
          invalidate();
          setForm(EMPTY_FORM);
          setEditingId(null);
          setManualOpen(false);
          toast({ title: "Jídelníček uložen", description: `${getMealLabel(form.mealType)} pro ${form.date} uložen.` });
        },
        onError: () => {
          toast({ title: "Chyba", description: "Nepodařilo se uložit jídelníček.", variant: "destructive" });
        },
      }
    );
  }

  function startEdit(item: { id: number; date: string; mealType: string; name: string }) {
    setForm({ date: item.date, mealType: item.mealType as "obed1" | "obed2", name: item.name });
    setEditingId(item.id);
    setManualOpen(true);
  }

  function handleDelete(id: number) {
    deleteMenu.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "Smazáno", description: "Položka jídelníčku byla smazána." });
      },
      onError: () => {
        toast({ title: "Chyba", description: "Nepodařilo se smazat položku.", variant: "destructive" });
      },
    });
  }

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">

        {/* ── Main row ── */}
        <div className="flex items-center gap-4 p-5">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Utensils className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Jídelníček</span>
              {isLoadingMenu ? null : hasTodayMenu ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Načten pro dnes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Dnes nenačten
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSuccess ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Poslední úspěšný sync:{" "}
                  {format(new Date(lastSuccess.triggeredAt), "d. MMMM yyyy, HH:mm", { locale: cs })}
                  {" "}· {lastSuccess.synced} pokrmů
                  {lastSuccess.source === "manual" && " (ručně)"}
                </span>
              ) : (
                "Automatická synchronizace v 07:00 každý pracovní den"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {hasTodayMenu && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-8 px-2"
                onClick={() => setMenuExpanded((v) => !v)}
              >
                {menuExpanded ? <><span>Skrýt</span><ChevronUp className="w-3.5 h-3.5 ml-1" /></> : <><span>Zobrazit menu</span><ChevronDown className="w-3.5 h-3.5 ml-1" /></>}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs"
              onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setManualOpen((v) => !v); }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Zadat ručně
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncMenus.isPending}
              size="sm"
              className="gap-2 h-9 text-xs"
              data-testid="button-sync-menu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMenus.isPending ? "animate-spin" : ""}`} />
              {syncMenus.isPending ? "Synchronizuji…" : "Sync Strava.cz"}
            </Button>
          </div>
        </div>

        {/* ── Last sync error banner ── */}
        {lastLog?.error && (
          <div className="mx-5 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Poslední sync selhal: </span>
              {lastLog.error}
              <span className="block text-xs text-red-500 mt-0.5">
                {format(new Date(lastLog.triggeredAt), "d. M. yyyy, HH:mm", { locale: cs })}
                {" · "}
                <button className="underline" onClick={() => setManualOpen(true)}>Zadat ručně</button>
              </span>
            </div>
          </div>
        )}

        {/* ── Manual entry form ── */}
        {manualOpen && (
          <div className="border-t bg-blue-50/60 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                {editingId ? "Upravit jídelníček" : "Zadat jídelníček ručně"}
              </p>
              <button onClick={() => { setManualOpen(false); setEditingId(null); setForm(EMPTY_FORM); }}>
                <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Datum</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-9 text-sm w-36"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Oběd</label>
                <div className="flex gap-1">
                  {(["obed1", "obed2"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mealType: t }))}
                      className={`px-3 h-9 rounded-lg text-sm font-medium border-2 transition-colors ${
                        form.mealType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {getMealLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Název jídla</label>
                <Input
                  placeholder="např. Kuřecí řízek, bramborová kaše, okurka"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpsert(); }}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={handleUpsert}
                  disabled={!form.name.trim() || upsertMenu.isPending}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {upsertMenu.isPending ? "Ukládám…" : editingId ? "Uložit změny" : "Přidat"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Zadávání ručně přepíše existující záznam pro stejný datum a oběd.
            </p>
          </div>
        )}

        {/* ── Today's menu detail ── */}
        {menuExpanded && hasTodayMenu && (
          <div className="border-t bg-muted/20 px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Dnešní menu · {format(new Date(), "d. MMMM yyyy", { locale: cs })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todayMenus
                .slice()
                .sort((a, b) => a.mealType.localeCompare(b.mealType))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-muted group"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {item.mealType === "obed1" ? "1" : "2"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                        {getMealLabel(item.mealType)}
                      </p>
                      <p className="text-sm font-medium leading-snug">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Upravit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Synchronizováno ·{" "}
              {format(new Date(todayMenus[0].syncedAt), "d. M. yyyy, HH:mm", { locale: cs })}
            </p>
          </div>
        )}

        {/* ── Sync log history ── */}
        {syncLog && syncLog.length > 0 && (
          <div className="border-t">
            <button
              className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setLogExpanded((v) => !v)}
            >
              <span className="font-semibold uppercase tracking-wide">Historie synchronizací</span>
              {logExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {logExpanded && (
              <div className="px-5 pb-4 space-y-1.5">
                {syncLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 rounded-lg px-3 py-2 text-xs ${
                      entry.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                    }`}
                  >
                    {entry.error ? (
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {entry.source === "manual" ? "Ruční zadání" : "Strava.cz sync"}
                      </span>
                      {!entry.error && (
                        <span className="ml-1 opacity-70">· {entry.synced} pokrmů</span>
                      )}
                      {entry.error && (
                        <span className="ml-1 opacity-80 truncate block">{entry.error}</span>
                      )}
                    </div>
                    <span className="shrink-0 opacity-60">
                      {format(new Date(entry.triggeredAt), "d. M. HH:mm", { locale: cs })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
