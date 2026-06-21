import { useState, useEffect } from "react";
import {
  useGetEmailSettings,
  useUpdateEmailSettings,
  useSendTestEmail,
  useSendReportEmail,
  useGetEmailLogs,
  getGetEmailSettingsQueryKey,
  getGetEmailLogsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  FlaskConical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetEmailSettings();
  const { data: logs } = useGetEmailLogs();
  const updateSettings = useUpdateEmailSettings();
  const sendTest = useSendTestEmail();
  const sendReport = useSendReportEmail();

  const [editing, setEditing] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [logsExpanded, setLogsExpanded] = useState(false);

  useEffect(() => {
    if (settings && !editing) {
      setRecipients(settings.recipients);
      setFromAddress(settings.fromAddress);
    }
  }, [settings, editing]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetEmailSettingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetEmailLogsQueryKey() });
  }

  function handleSave() {
    updateSettings.mutate(
      { data: { recipients, fromAddress } },
      {
        onSuccess: () => {
          setEditing(false);
          invalidate();
          toast({ title: "Nastavení uloženo", description: "E-mailové nastavení bylo aktualizováno." });
        },
        onError: () =>
          toast({ title: "Chyba", description: "Nepodařilo se uložit nastavení.", variant: "destructive" }),
      }
    );
  }

  function handleToggle(enabled: boolean) {
    updateSettings.mutate(
      { data: { enabled } },
      {
        onSuccess: () => {
          invalidate();
          toast({
            title: enabled ? "E-maily zapnuty" : "E-maily vypnuty",
            description: enabled
              ? "Přehledy budou automaticky odesílány každé pondělí."
              : "Automatické odesílání e-mailů bylo vypnuto.",
          });
        },
      }
    );
  }

  function handleSendTest() {
    sendTest.mutate(undefined, {
      onSuccess: (data) => {
        invalidate();
        if (data.success) {
          toast({ title: "Testovací e-mail odeslán", description: data.message });
        } else {
          toast({ title: "Chyba", description: data.message, variant: "destructive" });
        }
      },
      onError: () =>
        toast({ title: "Chyba", description: "Odeslání selhalo.", variant: "destructive" }),
    });
  }

  function handleSendReport() {
    sendReport.mutate(undefined, {
      onSuccess: (data) => {
        invalidate();
        if (data.success) {
          toast({ title: "Přehled odeslán", description: data.message });
        } else {
          toast({ title: "Chyba", description: data.message, variant: "destructive" });
        }
      },
      onError: () =>
        toast({ title: "Chyba", description: "Odeslání selhalo.", variant: "destructive" }),
    });
  }

  const lastLog = logs?.[0];
  const hasRecipients = !!settings?.recipients?.trim();
  const isEnabled = settings?.enabled ?? false;

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">

        {/* ── Main row ── */}
        <div className="flex items-start gap-4 p-5">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-0.5">
            <Mail className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="font-semibold text-sm">E-mailové přehledy</span>
              <span
                className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium border ${
                  isEnabled
                    ? "text-green-700 bg-green-50 border-green-200"
                    : "text-muted-foreground bg-muted border-transparent"
                }`}
              >
                {isEnabled ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isEnabled ? "Zapnuto" : "Vypnuto"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastLog ? (
                <span className="inline-flex items-center gap-1">
                  {lastLog.status === "success" ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  Posl. odesláno:{" "}
                  {format(new Date(lastLog.sentAt), "d. MMMM yyyy, HH:mm", { locale: cs })}
                  {lastLog.weekStart && ` · týden od ${lastLog.weekStart}`}
                </span>
              ) : isLoading ? (
                "Načítám…"
              ) : (
                "Zatím žádný e-mail nebyl odeslán"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1.5 text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Nastavit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs"
              onClick={handleSendTest}
              disabled={sendTest.isPending || !hasRecipients}
              title={!hasRecipients ? "Nejprve nastavte příjemce" : ""}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {sendTest.isPending ? "Odesílám…" : "Testovací e-mail"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-9 text-xs"
              onClick={handleSendReport}
              disabled={sendReport.isPending || !hasRecipients}
              title={!hasRecipients ? "Nejprve nastavte příjemce" : ""}
            >
              <Send className="w-3.5 h-3.5" />
              {sendReport.isPending ? "Odesílám…" : "Odeslat přehled"}
            </Button>
          </div>
        </div>

        {/* ── Error banner for last failed send ── */}
        {lastLog?.status === "failure" && lastLog.error && (
          <div className="mx-5 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Poslední odeslání selhalo: </span>
              {lastLog.error}
            </div>
          </div>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <div className="border-t bg-blue-50/60 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Nastavení e-mailu
              </p>
              <button
                onClick={() => {
                  setEditing(false);
                  setRecipients(settings?.recipients ?? "");
                  setFromAddress(settings?.fromAddress ?? "");
                }}
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Příjemci <span className="text-muted-foreground/60">(oddělte čárkou)</span>
                </label>
                <Input
                  type="text"
                  placeholder="reditel@gymnas.cz, zastupcereditel@gymnas.cz"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Odesílatel (From)
                </label>
                <Input
                  type="text"
                  placeholder="noreply@gymnas.cz"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                  <strong>Důležité:</strong> Doménu odesílatele musíte ověřit v Resend dashboardu
                  (resend.com). Pro testování použijte <code>onboarding@resend.dev</code>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-medium">Automatické odesílání</p>
                  <p className="text-xs text-muted-foreground">Každé pondělí po vygenerování přehledu</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="gap-1.5 h-9 text-xs"
                  onClick={handleSave}
                  disabled={updateSettings.isPending}
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateSettings.isPending ? "Ukládám…" : "Uložit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setEditing(false);
                    setRecipients(settings?.recipients ?? "");
                    setFromAddress(settings?.fromAddress ?? "");
                  }}
                >
                  Zrušit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Email log ── */}
        {logs && logs.length > 0 && (
          <div className="border-t">
            <button
              className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setLogsExpanded((v) => !v)}
            >
              <span className="font-semibold uppercase tracking-wide">
                Historie odesílání ({logs.length})
              </span>
              {logsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {logsExpanded && (
              <div className="px-5 pb-4 space-y-1.5">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 rounded-lg px-3 py-2 text-xs ${
                      entry.status === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {entry.status === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {entry.status === "success" ? "Odesláno" : "Chyba"}
                      </span>
                      {entry.weekStart && (
                        <span className="ml-1 opacity-70">· týden od {entry.weekStart}</span>
                      )}
                      <span className="block opacity-70 truncate">{entry.recipients}</span>
                      {entry.error && (
                        <span className="block opacity-80 mt-0.5">{entry.error}</span>
                      )}
                    </div>
                    <span className="shrink-0 opacity-60 whitespace-nowrap">
                      {format(new Date(entry.sentAt), "d. M. HH:mm", { locale: cs })}
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
