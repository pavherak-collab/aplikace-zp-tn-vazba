import { useState } from "react";
import { useSyncMenus, useGetMenus, getGetMenusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Utensils, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const LAST_SYNC_KEY = "menu_last_sync";

const getMealName = (type: string) => (type === "obed1" ? "Oběd 1" : "Oběd 2");

export default function MenuSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const syncMenus = useSyncMenus();

  const today = new Date().toISOString().split("T")[0];
  const { data: todayMenus, isLoading: isLoadingMenu } = useGetMenus({ date: today });

  const [lastSync, setLastSync] = useState<Date | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : null;
  });
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const hasTodayMenu = todayMenus && todayMenus.length > 0;

  function handleSync() {
    syncMenus.mutate(undefined, {
      onSuccess: (data) => {
        const now = new Date();
        setLastSync(now);
        setSyncedCount(data.synced);
        localStorage.setItem(LAST_SYNC_KEY, now.toISOString());

        queryClient.invalidateQueries({ queryKey: getGetMenusQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/menus"] });

        toast({
          title: "Jídelníček synchronizován",
          description: data.message ?? `Načteno ${data.synced} pokrmů ze Strava.cz.`,
        });
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Synchronizace se nezdařila. Zkuste to prosím znovu.";
        toast({
          title: "Chyba synchronizace",
          description: message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-center gap-4 p-5">
          {/* Icon */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Utensils className="w-5 h-5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Jídelníček ze Strava.cz</span>
              {hasTodayMenu ? (
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
              {lastSync ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Poslední sync: {format(lastSync, "d. MMMM yyyy, HH:mm", { locale: cs })}
                  {syncedCount !== null && ` · ${syncedCount} pokrmů`}
                </span>
              ) : (
                "Synchronizuje se automaticky v 07:00 každý pracovní den"
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {hasTodayMenu && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-8 px-2"
                onClick={() => setExpanded((v) => !v)}
                data-testid="button-toggle-menu"
              >
                {expanded ? (
                  <>Skrýt <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                ) : (
                  <>Zobrazit menu <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                )}
              </Button>
            )}
            <Button
              onClick={handleSync}
              disabled={syncMenus.isPending}
              size="sm"
              className="gap-2 h-9"
              data-testid="button-sync-menu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMenus.isPending ? "animate-spin" : ""}`} />
              {syncMenus.isPending ? "Synchronizuji…" : "Synchronizovat jídelníček"}
            </Button>
          </div>
        </div>

        {/* Expanded today's menu */}
        {expanded && hasTodayMenu && (
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
                    className="flex gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-muted"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {item.mealType === "obed1" ? "1" : "2"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                        {getMealName(item.mealType)}
                      </p>
                      <p className="text-sm font-medium leading-snug">{item.name}</p>
                    </div>
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Načteno ze Strava.cz ·{" "}
              {format(new Date(todayMenus[0].syncedAt), "d. M. yyyy, HH:mm", { locale: cs })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
