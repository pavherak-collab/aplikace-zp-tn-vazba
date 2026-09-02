import { useState } from "react";
import { useListFeedback, useGetFeedbackStats, useGetMenus } from "@workspace/api-client-react";
import PinGuard from "@/components/pin-guard";
import WeeklyReport from "@/components/weekly-report";
import ReportHistory from "@/components/report-history";
import MenuSync from "@/components/menu-sync";
import EmailSettings from "@/components/email-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Link } from "wouter";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowLeft, ChefHat, Frown, Meh, Smile, LogOut } from "lucide-react";
import { FeedbackRating } from "@workspace/api-client-react";

const DAILY_MEALS = ["obed1", "obed2"] as const;

const DAILY_RATINGS = [
  { key: "positive", label: "Chutnalo", color: "#22c55e", icon: Smile },
  { key: "neutral", label: "Neutrální", color: "#eab308", icon: Meh },
  { key: "negative", label: "Nechutnalo", color: "#ef4444", icon: Frown },
] as const;

function getPragueToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCurrentWeekDates() {
  const today = new Date(`${getPragueToday()}T12:00:00`);
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return format(date, "yyyy-MM-dd");
  });
}

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(getPragueToday);
  const { data: stats, isLoading: isLoadingStats } = useGetFeedbackStats();
  const { data: dailyStats, isLoading: isLoadingDailyStats } = useGetFeedbackStats({ date: selectedDate });
  const { data: selectedDayMenus, isLoading: isLoadingDayMenus } = useGetMenus({ date: selectedDate });
  const { data: feedback, isLoading: isLoadingFeedback } = useListFeedback();

  const getRatingBadge = (rating: FeedbackRating) => {
    switch (rating) {
      case "positive":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Smile className="w-3 h-3 mr-1" /> Pozitivní</Badge>;
      case "neutral":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Meh className="w-3 h-3 mr-1" /> Neutrální</Badge>;
      case "negative":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><Frown className="w-3 h-3 mr-1" /> Negativní</Badge>;
    }
  };

  const getMealName = (meal: string) => {
    return meal === "obed1" ? "Oběd 1" : meal === "obed2" ? "Oběd 2" : meal;
  };

  const mealOrder = (meal: string) => {
    if (meal === "obed1") return 1;
    if (meal === "obed2") return 2;
    return 3;
  };

  const groupedFeedback = feedback
    ? Object.entries(
        feedback.reduce<Record<string, NonNullable<typeof feedback>[number][]>>((groups, item) => {
          const dayKey = format(new Date(item.createdAt), "yyyy-MM-dd");
          (groups[dayKey] ??= []).push(item);
          return groups;
        }, {})
      )
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, items]) => [
          date,
          [...items].sort(
            (a, b) =>
              mealOrder(a.meal) - mealOrder(b.meal) ||
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        ] as const)
    : [];

  // Prepare chart data based on stats
  const chartData = stats?.map(stat => ({
    name: getMealName(stat.meal),
    "Pozitivní": stat.positive,
    "Neutrální": stat.neutral,
    "Negativní": stat.negative,
    total: stat.total
  })) || [];

  const dayStats = DAILY_MEALS.map((meal) => {
    const stat = dailyStats?.find((item) => item.meal === meal);
    const menu = selectedDayMenus?.find((item) => item.mealType === meal);
    const total = stat?.total ?? 0;
    return {
      meal,
      mealLabel: getMealName(meal),
      mealName: menu?.name ?? null,
      total,
      ratings: DAILY_RATINGS.map((rating) => ({
        ...rating,
        count: stat?.[rating.key] ?? 0,
        percent: total === 0 ? 0 : Math.round(((stat?.[rating.key] ?? 0) / total) * 100),
      })),
    };
  });

  const isLoadingDaily = isLoadingDailyStats || isLoadingDayMenus;
  const weekDates = getCurrentWeekDates();

  return (
    <PinGuard>
    <div className="min-h-screen pb-12" style={{ backgroundImage: "url('/background.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                <ChefHat className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg" data-testid="text-admin-title">Přehled obědů</h1>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("admin_unlocked");
              window.location.reload();
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-12">

        <WeeklyReport />

        <MenuSync />

        <EmailSettings />

        <ReportHistory />

        {/* Stats Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Statistiky</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoadingStats ? (
              <>
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
              </>
            ) : stats?.map((stat, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-muted-foreground">{getMealName(stat.meal)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-extrabold mb-1" data-testid={`text-stat-total-${stat.meal}`}>{stat.total}</div>
                  <p className="text-sm text-muted-foreground font-medium">celkem hodnocení</p>
                  
                  <div className="flex items-center gap-3 mt-4 text-sm font-medium">
                    <div className="flex items-center gap-1 text-green-600">
                      <Smile className="w-4 h-4" /> {stat.positive}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Meh className="w-4 h-4" /> {stat.neutral}
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <Frown className="w-4 h-4" /> {stat.negative}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoadingStats && (!stats || stats.length === 0) && (
              <div className="col-span-3 text-center py-10 bg-muted/50 rounded-xl">
                <p className="text-muted-foreground">Zatím žádné statistiky.</p>
              </div>
            )}
          </div>

          {!isLoadingStats && stats && stats.length > 0 && (
            <Card className="border-0 shadow-md mb-10 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>Porovnání obědů</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 500 }} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Pozitivní" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Bar dataKey="Neutrální" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Bar dataKey="Negativní" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Detail podle dne</CardTitle>
                <CardDescription>
                  Výsledky hodnocení pro vybraný den a jednotlivé obědy
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="stats-date" className="text-sm font-medium whitespace-nowrap">
                  Vyberte den
                </label>
                <select
                  id="stats-date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  data-testid="select-stats-date"
                >
                  {weekDates.map((date) => (
                    <option key={date} value={date}>
                      {format(new Date(`${date}T12:00:00`), "EEEE d. MMMM yyyy", { locale: cs })}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {isLoadingDaily ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-[310px] rounded-xl" />
                  <Skeleton className="h-[310px] rounded-xl" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dayStats.map((meal) => {
                    const pieData = meal.ratings.map((rating) => ({
                      name: rating.label,
                      value: rating.count,
                      color: rating.color,
                    }));

                    return (
                      <Card key={meal.meal} className="border bg-card shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{meal.mealLabel}</CardTitle>
                          {meal.mealName ? (
                            <CardDescription className="text-sm">{meal.mealName}</CardDescription>
                          ) : (
                            <CardDescription className="text-sm italic">
                              Název jídla pro tento den není k dispozici
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                            <div className="h-[150px]">
                              {meal.total === 0 ? (
                                <div className="h-full flex items-center justify-center rounded-full border-[18px] border-muted text-center text-xs text-muted-foreground">
                                  Bez hodnocení
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={38}
                                      outerRadius={64}
                                      paddingAngle={3}
                                      dataKey="value"
                                    >
                                      {pieData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => [`${value} ${value === 1 ? "hlas" : "hlasů"}`, name]}
                                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                            <div className="space-y-3">
                              {meal.ratings.map((rating) => {
                                const RatingIcon = rating.icon;
                                return (
                                  <div key={rating.key} className="flex items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <RatingIcon className="w-4 h-4" style={{ color: rating.color }} />
                                      <span className="font-medium">{rating.label}</span>
                                    </div>
                                    <span className="text-muted-foreground whitespace-nowrap">
                                      <strong className="text-foreground">{rating.count}</strong> · {rating.percent}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                            Celkem hodnocení: <span className="font-semibold text-foreground">{meal.total}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Feedback List Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Všechna hodnocení</h2>
          </div>

          <Card className="border-0 shadow-md overflow-hidden">
            {isLoadingFeedback ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !feedback || feedback.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <ChefHat className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Zatím prázdno</h3>
                <p className="text-muted-foreground">Ještě nikdo neohodnotil žádný oběd.</p>
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-6">
                {groupedFeedback.map(([date, items]) => (
                  <Card key={date} className="border shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-5 bg-muted/30 border-b">
                      <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-wide">
                        {format(new Date(`${date}T12:00:00`), "EEEE d. MMMM yyyy", { locale: cs })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="px-5 py-4"
                            data-testid={`feedback-day-item-${item.id}`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="font-semibold"
                                    data-testid={`text-feedback-meal-${item.id}`}
                                  >
                                    {getMealName(item.meal)}
                                  </span>
                                  {getRatingBadge(item.rating)}
                                </div>
                                {item.mealName && (
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {item.mealName}
                                  </div>
                                )}
                              </div>
                              <time
                                className="shrink-0 text-xs font-medium text-muted-foreground"
                                dateTime={item.createdAt}
                                data-testid={`text-feedback-date-${item.id}`}
                              >
                                {format(new Date(item.createdAt), "HH:mm", { locale: cs })}
                              </time>
                            </div>
                            <p
                              className={`mt-3 text-sm leading-relaxed ${
                                item.comment ? "text-foreground" : "text-muted-foreground italic"
                              }`}
                              data-testid={`text-feedback-comment-${item.id}`}
                            >
                              {item.comment || "Bez komentáře"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </section>

      </main>
    </div>
    </PinGuard>
  );
}
