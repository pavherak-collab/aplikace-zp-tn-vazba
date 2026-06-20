import { useState } from "react";
import { useGetWeeklyReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Smile, Meh, Frown, Trophy, ThumbsDown, MessageSquare, CalendarDays, Download } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { generateWeeklyPdf } from "@/lib/generate-weekly-pdf";

const getMealName = (meal: string) =>
  meal === "obed1" ? "Oběd 1" : meal === "obed2" ? "Oběd 2" : meal;

const RATING_COLORS = {
  positive: "#84cc16",
  neutral: "#eab308",
  negative: "#ef4444",
};

export default function WeeklyReport() {
  const { data: report, isLoading } = useGetWeeklyReport();
  const [downloading, setDownloading] = useState(false);

  function handleDownload() {
    if (!report) return;
    setDownloading(true);
    setTimeout(() => {
      generateWeeklyPdf(report);
      setDownloading(false);
    }, 100);
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);

  const weekLabel = `${format(weekStart, "d. MMMM", { locale: cs })} – ${format(now, "d. MMMM yyyy", { locale: cs })}`;

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Týdenní přehled</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </section>
    );
  }

  if (!report) return null;

  const pieData = [
    { name: "Pozitivní", value: report.positivePercent, color: RATING_COLORS.positive },
    { name: "Neutrální", value: report.neutralPercent, color: RATING_COLORS.neutral },
    { name: "Negativní", value: report.negativePercent, color: RATING_COLORS.negative },
  ].filter((d) => d.value > 0);

  return (
    <section data-testid="section-weekly-report">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Týdenní přehled</h2>
            <p className="text-sm text-muted-foreground">{weekLabel}</p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading || !report}
          className="flex items-center gap-2 shadow-sm"
          data-testid="button-download-pdf"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generuji..." : "Stáhnout report (PDF)"}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm" data-testid="card-total-week">
          <CardContent className="pt-6 pb-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Hodnocení tento týden</p>
            <p className="text-4xl font-extrabold text-foreground">{report.totalThisWeek}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-green-50/80 backdrop-blur-sm" data-testid="card-positive-pct">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Smile className="w-4 h-4" />
              <p className="text-sm font-medium">Pozitivní</p>
            </div>
            <p className="text-4xl font-extrabold text-green-700">{report.positivePercent}%</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-yellow-50/80 backdrop-blur-sm" data-testid="card-neutral-pct">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Meh className="w-4 h-4" />
              <p className="text-sm font-medium">Neutrální</p>
            </div>
            <p className="text-4xl font-extrabold text-yellow-700">{report.neutralPercent}%</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-red-50/80 backdrop-blur-sm" data-testid="card-negative-pct">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Frown className="w-4 h-4" />
              <p className="text-sm font-medium">Negativní</p>
            </div>
            <p className="text-4xl font-extrabold text-red-700">{report.negativePercent}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pie chart */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rozložení hodnocení</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Tento týden zatím žádná data
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${value}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => [`${value}%`]}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best & Worst meal */}
        <div className="flex flex-col gap-4">
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm flex-1" data-testid="card-best-meal">
            <CardContent className="pt-6 pb-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nejlépe hodnocený oběd</p>
                <p className="text-2xl font-bold text-foreground">
                  {report.bestMeal ? getMealName(report.bestMeal) : "–"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm flex-1" data-testid="card-worst-meal">
            <CardContent className="pt-6 pb-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ThumbsDown className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nejhůře hodnocený oběd</p>
                <p className="text-2xl font-bold text-foreground">
                  {report.worstMeal ? getMealName(report.worstMeal) : "–"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent comments */}
      {report.recentComments.length > 0 && (
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Nejnovější komentáře
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 divide-y">
            {report.recentComments.map((c, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0" data-testid={`comment-item-${i}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{getMealName(c.meal)}</span>
                  {c.rating === "positive" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs"><Smile className="w-3 h-3 mr-1" />Pozitivní</Badge>}
                  {c.rating === "neutral" && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"><Meh className="w-3 h-3 mr-1" />Neutrální</Badge>}
                  {c.rating === "negative" && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs"><Frown className="w-3 h-3 mr-1" />Negativní</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(c.createdAt), "d. M., HH:mm", { locale: cs })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
