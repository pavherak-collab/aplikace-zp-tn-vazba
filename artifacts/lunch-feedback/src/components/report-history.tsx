import { useListWeeklyReports, useGenerateWeeklyReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  FileText, RefreshCw, Smile, Meh, Frown, Trophy, ThumbsDown, MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListWeeklyReportsQueryKey } from "@workspace/api-client-react";

const getMealName = (meal: string | null | undefined) =>
  meal === "obed1" ? "Oběd 1" : meal === "obed2" ? "Oběd 2" : meal ?? "–";

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export default function ReportHistory() {
  const { data: reports, isLoading } = useListWeeklyReports();
  const generateReport = useGenerateWeeklyReport();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  function handleGenerate() {
    setGenerating(true);
    generateReport.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWeeklyReportsQueryKey() });
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Archiv týdenních přehledů</h2>
            <p className="text-sm text-muted-foreground">
              Automaticky generováno každé pondělí v 06:00
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2"
          data-testid="button-generate-report"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generuji..." : "Generovat nyní"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Zatím žádné uložené přehledy</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Reporty se generují automaticky každé pondělí. Klikněte na "Generovat nyní" pro okamžité vytvoření reportu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const weekEnd = new Date(report.weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekLabel = `${format(new Date(report.weekStart), "d. MMMM", { locale: cs })} – ${format(weekEnd, "d. MMMM yyyy", { locale: cs })}`;
            const positivePct = pct(report.positiveCount, report.totalFeedback);
            const neutralPct = pct(report.neutralCount, report.totalFeedback);
            const negativePct = pct(report.negativeCount, report.totalFeedback);

            return (
              <Card key={report.id} className="border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{weekLabel}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      Vygenerováno {format(new Date(report.generatedAt), "d. M. yyyy, HH:mm", { locale: cs })}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">{report.totalFeedback}</div>
                      <div className="text-xs text-muted-foreground mt-1">Hodnocení celkem</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <Smile className="w-5 h-5" />{positivePct}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Pozitivní</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                        <Meh className="w-5 h-5" />{neutralPct}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Neutrální</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                        <Frown className="w-5 h-5" />{negativePct}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Negativní</div>
                    </div>
                  </div>

                  {/* Rating bar */}
                  <div className="h-2 rounded-full overflow-hidden flex mb-4">
                    {positivePct > 0 && (
                      <div className="bg-green-400" style={{ width: `${positivePct}%` }} />
                    )}
                    {neutralPct > 0 && (
                      <div className="bg-yellow-400" style={{ width: `${neutralPct}%` }} />
                    )}
                    {negativePct > 0 && (
                      <div className="bg-red-400" style={{ width: `${negativePct}%` }} />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mb-4">
                    {report.bestMeal && (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full font-medium">
                        <Trophy className="w-3.5 h-3.5" />
                        Nejlepší: {getMealName(report.bestMeal)}
                      </div>
                    )}
                    {report.worstMeal && (
                      <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-sm px-3 py-1.5 rounded-full font-medium">
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Nejhorší: {getMealName(report.worstMeal)}
                      </div>
                    )}
                  </div>

                  {report.topComments && report.topComments.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Nejčastější komentáře
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.topComments.slice(0, 5).map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {c.text}
                            {c.count > 1 && (
                              <span className="ml-1 bg-muted-foreground/20 rounded px-1">×{c.count}</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
