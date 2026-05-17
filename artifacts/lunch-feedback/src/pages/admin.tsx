import { useListFeedback, useGetFeedbackStats } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Link } from "wouter";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowLeft, ChefHat, Frown, Meh, Smile } from "lucide-react";
import { FeedbackRating } from "@workspace/api-client-react";

export default function Admin() {
  const { data: stats, isLoading: isLoadingStats } = useGetFeedbackStats();
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

  // Prepare chart data based on stats
  const chartData = stats?.map(stat => ({
    name: getMealName(stat.meal),
    "Pozitivní": stat.positive,
    "Neutrální": stat.neutral,
    "Negativní": stat.negative,
    total: stat.total
  })) || [];

  return (
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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Datum a čas</TableHead>
                      <TableHead>Oběd</TableHead>
                      <TableHead>Hodnocení</TableHead>
                      <TableHead className="min-w-[300px]">Komentář</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground font-medium whitespace-nowrap" data-testid={`text-feedback-date-${item.id}`}>
                          {format(new Date(item.createdAt), "d. MMMM yyyy, HH:mm", { locale: cs })}
                        </TableCell>
                        <TableCell className="font-semibold" data-testid={`text-feedback-meal-${item.id}`}>
                          {getMealName(item.meal)}
                        </TableCell>
                        <TableCell data-testid={`text-feedback-rating-${item.id}`}>
                          {getRatingBadge(item.rating)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate" data-testid={`text-feedback-comment-${item.id}`}>
                          {item.comment ? (
                            <span>{item.comment}</span>
                          ) : (
                            <span className="italic opacity-50">Bez komentáře</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </section>

      </main>
    </div>
  );
}
