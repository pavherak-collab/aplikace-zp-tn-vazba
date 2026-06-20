import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateFeedback, useGetMenus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Frown, Meh, Smile } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CreateFeedbackInputRating } from "@workspace/api-client-react";

const formSchema = z.object({
  meal: z.string().min(1, "Vyberte oběd"),
  rating: z.nativeEnum(CreateFeedbackInputRating, {
    required_error: "Ohodnoťte oběd",
  }),
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const createFeedback = useCreateFeedback();
  const today = new Date().toISOString().split("T")[0];
  const { data: menus } = useGetMenus({ date: today });

  const SERVING_TIMES: Record<string, string> = {
    obed1: "Výdej 11:00 – 12:00",
    obed2: "Výdej 12:00 – 13:00",
  };

  const getMealSubtext = (mealType: "obed1" | "obed2"): string => {
    const item = menus?.find((m) => m.mealType === mealType);
    return item ? item.name : SERVING_TIMES[mealType];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meal: "",
      rating: undefined,
      comment: "",
    },
  });

  function onSubmit(data: FormValues) {
    createFeedback.mutate(
      { data: { ...data, comment: data.comment || null } },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: () => {
          toast({
            title: "Něco se pokazilo",
            description: "Nepodařilo se odeslat zpětnou vazbu. Zkuste to prosím znovu.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary opacity-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        
        <Card className="w-full max-w-md border-0 shadow-xl bg-card z-10 animate-in zoom-in-95 duration-500">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-foreground" data-testid="text-success-title">Díky za hodnocení!</h2>
            <p className="text-muted-foreground mb-8 text-lg" data-testid="text-success-desc">
              Tvoje zpětná vazba nám pomůže dělat lepší obědy pro všechny.
            </p>
            <Button 
              size="lg"
              className="w-full text-lg h-14 rounded-xl"
              onClick={() => {
                form.reset();
                setSubmitted(false);
              }}
              data-testid="button-new-feedback"
            >
              Hodnotit další oběd
            </Button>
            
            <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors mt-6 text-sm font-medium" data-testid="link-admin">
              Jsem správce
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden" style={{ backgroundImage: "url('/background.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <div className="absolute inset-0 bg-white/30 pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 relative">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-3" data-testid="text-main-title">
            Jaký byl dnešní <span className="text-primary">oběd?</span>
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-main-subtitle">
            Buď upřímný, pomůžeš nám se zlepšit!
          </p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <FormField
                  control={form.control}
                  name="meal"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-lg font-semibold text-foreground">Který oběd jsi měl/a?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col gap-3"
                          data-testid="input-meal"
                        >
                          {(["obed1", "obed2"] as const).map((mealType) => {
                            const num = mealType === "obed1" ? "1" : "2";
                            const label = mealType === "obed1" ? "Oběd 1" : "Oběd 2";
                            const subtext = getMealSubtext(mealType);
                            const hasRealMenu = menus?.some((m) => m.mealType === mealType);
                            const isSelected = field.value === mealType;
                            return (
                              <FormItem key={mealType}>
                                <FormControl>
                                  <div className="relative">
                                    <RadioGroupItem value={mealType} id={mealType} className="sr-only" />
                                    <Label
                                      htmlFor={mealType}
                                      className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all cursor-pointer ${
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-muted bg-card hover:border-primary/40 hover:bg-primary/5"
                                      }`}
                                    >
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-extrabold transition-colors ${
                                        isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                      }`}>
                                        {num}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div
                                          className="font-bold text-foreground text-base leading-tight"
                                          data-testid={`label-${mealType}`}
                                        >
                                          {label}
                                        </div>
                                        <div className={`text-sm mt-0.5 leading-snug ${hasRealMenu ? "text-foreground/70" : "text-muted-foreground italic"}`}>
                                          {subtext}
                                        </div>
                                      </div>
                                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                        isSelected ? "border-primary" : "border-muted-foreground/40"
                                      }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                      </div>
                                    </Label>
                                  </div>
                                </FormControl>
                              </FormItem>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-lg font-semibold text-foreground">Jak ti chutnalo?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                          data-testid="input-rating"
                        >
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <RadioGroupItem value="positive" id="positive" className="peer sr-only" />
                                <Label htmlFor="positive" className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-muted bg-card p-4 hover:bg-green-50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 transition-all cursor-pointer group">
                                  <Smile className="w-10 h-10 text-green-500 group-data-[state=checked]:scale-110 transition-transform" />
                                  <span className="text-sm font-medium text-center leading-tight" data-testid="label-positive">Dal bych si znovu</span>
                                </Label>
                              </div>
                            </FormControl>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <RadioGroupItem value="neutral" id="neutral" className="peer sr-only" />
                                <Label htmlFor="neutral" className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-muted bg-card p-4 hover:bg-yellow-50 peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:bg-yellow-50 peer-data-[state=checked]:text-yellow-700 transition-all cursor-pointer group">
                                  <Meh className="w-10 h-10 text-yellow-500 group-data-[state=checked]:scale-110 transition-transform" />
                                  <span className="text-sm font-medium text-center leading-tight" data-testid="label-neutral">Bylo to průměrné</span>
                                </Label>
                              </div>
                            </FormControl>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <RadioGroupItem value="negative" id="negative" className="peer sr-only" />
                                <Label htmlFor="negative" className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-muted bg-card p-4 hover:bg-red-50 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 transition-all cursor-pointer group">
                                  <Frown className="w-10 h-10 text-red-500 group-data-[state=checked]:scale-110 transition-transform" />
                                  <span className="text-sm font-medium text-center leading-tight" data-testid="label-negative">Už bych si nedal</span>
                                </Label>
                              </div>
                            </FormControl>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-foreground">Chceš nám něco vzkázat? (Volitelné)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Co konkrétně ti chutnalo nebo nechutnalo?" 
                          className="resize-none min-h-[100px] text-base rounded-xl bg-background/50 focus:bg-background transition-colors"
                          {...field} 
                          data-testid="input-comment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                  disabled={createFeedback.isPending}
                  data-testid="button-submit"
                >
                  {createFeedback.isPending ? "Odesílám..." : "Odeslat hodnocení"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Link href="/admin" className="text-muted-foreground/60 hover:text-primary transition-colors text-sm font-medium" data-testid="link-admin">
            Jsem správce
          </Link>
        </div>
      </div>
    </div>
  );
}

// Simple label helper for the radio buttons
function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props} />;
}
