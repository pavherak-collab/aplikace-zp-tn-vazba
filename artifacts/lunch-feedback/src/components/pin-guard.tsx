import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

const ADMIN_PIN = "1234";
const SESSION_KEY = "admin_unlocked";

interface PinGuardProps {
  children: React.ReactNode;
}

export default function PinGuard({ children }: PinGuardProps) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) {
    return <>{children}</>;
  }

  function press(digit: string) {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setUnlocked(true);
      } else {
        setError(true);
        setTimeout(() => {
          setEntered("");
          setError(false);
        }, 600);
      }
    }
  }

  function del() {
    setEntered((prev) => prev.slice(0, -1));
    setError(false);
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-white/30 pointer-events-none" />

      <Card className="w-full max-w-xs border-0 shadow-xl bg-white/90 backdrop-blur-sm z-10">
        <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Přihlášení správce</h2>
            <p className="text-muted-foreground text-sm mt-1">Zadejte PIN pro přístup</p>
          </div>

          <div className="flex gap-3" data-testid="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  error
                    ? "border-red-400 bg-red-400"
                    : entered.length > i
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-transparent"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium -mt-2" data-testid="text-pin-error">
              Nesprávný PIN
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 w-full">
            {digits.map((d, i) => {
              if (d === "") return <div key={i} />;
              if (d === "del") {
                return (
                  <button
                    key={i}
                    onClick={del}
                    className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors active:scale-95"
                    data-testid="button-pin-delete"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => press(d)}
                  className="h-14 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary font-semibold text-xl text-foreground transition-colors active:scale-95"
                  data-testid={`button-pin-${d}`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs w-full"
            onClick={() => window.history.back()}
            data-testid="button-pin-back"
          >
            Zpět
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
