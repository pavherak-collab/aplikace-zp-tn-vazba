import { db, emailSettingsTable, emailLogsTable, weeklyReportsTable } from "@workspace/db";
import type { WeeklyReport, MealBreakdownItem, TopComment } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "./logger";

// ── PDF generation (pdfkit) ──────────────────────────────────────────────────

async function generateReportPdf(report: WeeklyReport): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pct = (n: number, total: number) =>
      total > 0 ? `${Math.round((n / total) * 100)} %` : "—";
    const mealLabel = (m: string) => (m === "obed1" ? "Obed 1" : m === "obed2" ? "Obed 2" : m);

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Tydeni prehled skolnich obedu", { align: "center" });
    doc.fontSize(12).font("Helvetica").moveDown(0.5);
    doc
      .text(`Tyden od: ${report.weekStart}`, { align: "center" })
      .text(`Vygenerovano: ${new Date(report.generatedAt).toLocaleString("cs-CZ")}`, { align: "center" });

    doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();

    // Summary
    doc.fontSize(14).font("Helvetica-Bold").text("Souhrn");
    doc.fontSize(11).font("Helvetica").moveDown(0.3);
    doc.text(`Celkovy pocet hodnoceni: ${report.totalFeedback}`);
    doc.text(
      `Pozitivni: ${report.positiveCount} (${pct(report.positiveCount, report.totalFeedback)})`
    );
    doc.text(
      `Neutralni: ${report.neutralCount} (${pct(report.neutralCount, report.totalFeedback)})`
    );
    doc.text(
      `Negativni: ${report.negativeCount} (${pct(report.negativeCount, report.totalFeedback)})`
    );
    if (report.bestMeal)
      doc.moveDown(0.3).text(`Nejlepsi obed: ${mealLabel(report.bestMeal)}`);
    if (report.worstMeal)
      doc.text(`Nejhorsi obed: ${mealLabel(report.worstMeal)}`);

    // Meal breakdown
    const breakdown = (report.mealBreakdown ?? []) as MealBreakdownItem[];
    if (breakdown.length > 0) {
      doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text("Hodnoceni dle obeda");
      doc.fontSize(11).font("Helvetica").moveDown(0.3);
      for (const item of breakdown) {
        doc.font("Helvetica-Bold").text(mealLabel(item.meal), { continued: false });
        doc.font("Helvetica").text(
          `  Celkem: ${item.total}  |  Pozitivni: ${item.positive} (${pct(item.positive, item.total)})  |  Neutralni: ${item.neutral} (${pct(item.neutral, item.total)})  |  Negativni: ${item.negative} (${pct(item.negative, item.total)})`
        );
      }
    }

    // Top comments
    const comments = (report.topComments ?? []) as TopComment[];
    if (comments.length > 0) {
      doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();
      doc.fontSize(14).font("Helvetica-Bold").text("Nejcastejsi komentare");
      doc.fontSize(11).font("Helvetica").moveDown(0.3);
      for (const c of comments.slice(0, 5)) {
        doc.text(`"${c.text}" (${mealLabel(c.meal)}, ${c.count}x)`);
      }
    }

    doc.end();
  });
}

// ── HTML email body ──────────────────────────────────────────────────────────

function buildEmailHtml(report: WeeklyReport): string {
  const pct = (n: number, total: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}&nbsp;%` : "—";
  const mealLabel = (m: string) => (m === "obed1" ? "Ob&#283;d 1" : m === "obed2" ? "Ob&#283;d 2" : m);
  const breakdown = (report.mealBreakdown ?? []) as MealBreakdownItem[];

  const rowsHtml = breakdown
    .map(
      (item) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;font-weight:600;">${mealLabel(item.meal)}</td>
        <td style="padding:8px 12px;text-align:center;">${item.total}</td>
        <td style="padding:8px 12px;text-align:center;color:#16a34a;">${item.positive} (${pct(item.positive, item.total)})</td>
        <td style="padding:8px 12px;text-align:center;color:#ca8a04;">${item.neutral} (${pct(item.neutral, item.total)})</td>
        <td style="padding:8px 12px;text-align:center;color:#dc2626;">${item.negative} (${pct(item.negative, item.total)})</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#4f7942;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">T&#253;denn&#237; p&#345;ehled &#353;koln&#237;ch ob&#283;d&#367;</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px;">T&#253;den od: ${report.weekStart}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#374151;line-height:1.6;">Dobr&#253; den,</p>
      <p style="color:#374151;line-height:1.6;">v p&#345;&#237;loze naleznete automaticky vygenerovan&#253; t&#253;denn&#237; p&#345;ehled zp&#283;tn&#233; vazby na &#353;koln&#237; ob&#283;dy.</p>

      <h2 style="font-size:16px;color:#111827;margin:24px 0 12px;">Souhrn t&#253;dne</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${report.positiveCount}</div>
          <div style="font-size:12px;color:#15803d;margin-top:2px;">Pozitivn&#237;</div>
        </div>
        <div style="flex:1;min-width:120px;background:#fefce8;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#ca8a04;">${report.neutralCount}</div>
          <div style="font-size:12px;color:#a16207;margin-top:2px;">Neutr&#225;ln&#237;</div>
        </div>
        <div style="flex:1;min-width:120px;background:#fef2f2;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#dc2626;">${report.negativeCount}</div>
          <div style="font-size:12px;color:#b91c1c;margin-top:2px;">Negativn&#237;</div>
        </div>
        <div style="flex:1;min-width:120px;background:#f3f4f6;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#111827;">${report.totalFeedback}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Celkem</div>
        </div>
      </div>

      ${
        breakdown.length > 0
          ? `<h2 style="font-size:16px;color:#111827;margin:24px 0 12px;">Hodnocen&#237; dle ob&#283;da</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Ob&#283;d</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600;">Celkem</th>
            <th style="padding:8px 12px;text-align:center;color:#16a34a;font-weight:600;">😊</th>
            <th style="padding:8px 12px;text-align:center;color:#ca8a04;font-weight:600;">😐</th>
            <th style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:600;">😞</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`
          : ""
      }

      ${report.bestMeal ? `<p style="margin-top:20px;color:#374151;">🏆 <strong>Nejlep&#353;&#237; ob&#283;d t&#253;dne:</strong> ${mealLabel(report.bestMeal)}</p>` : ""}

    </div>
    <div style="background:#f3f4f6;padding:20px 32px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">S pozdravem<br/><strong style="color:#6b7280;">Syst&#233;m hodnocen&#237; &#353;koln&#237;ch ob&#283;d&#367; &mdash; Gymn&#225;zium A&#353;</strong></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Settings helpers ─────────────────────────────────────────────────────────

export async function getOrCreateEmailSettings() {
  const rows = await db.select().from(emailSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(emailSettingsTable)
    .values({ recipients: "", fromAddress: "noreply@gymnas.cz", enabled: false })
    .returning();
  return created;
}

// ── Core send function ───────────────────────────────────────────────────────

export async function sendWeeklyReportEmail(
  report: WeeklyReport,
  opts?: { isTest?: boolean }
): Promise<{ success: boolean; message: string; error?: string }> {
  const settings = await getOrCreateEmailSettings();

  if (!settings.recipients.trim()) {
    return { success: false, message: "Nejsou nastaveni příjemci e-mailu.", error: "no_recipients" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      message: "RESEND_API_KEY není nastaveno. Připojte Resend integraci.",
      error: "missing_api_key",
    };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const recipientList = settings.recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const subject = opts?.isTest
    ? "[TEST] Týdenní přehled školních obědů"
    : "Týdenní přehled školních obědů";

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateReportPdf(report);
  } catch (pdfErr) {
    logger.error({ pdfErr }, "PDF generation failed — sending email without attachment");
  }

  const attachments = pdfBuffer
    ? [
        {
          filename: `tydenni-prehled-obedu-${report.weekStart}.pdf`,
          content: pdfBuffer,
        },
      ]
    : [];

  let status: "success" | "failure" = "success";
  let errorMsg: string | undefined;

  try {
    await resend.emails.send({
      from: settings.fromAddress,
      to: recipientList,
      subject,
      html: buildEmailHtml(report),
      attachments,
    });
    logger.info({ recipients: recipientList, weekStart: report.weekStart }, "Email sent");
  } catch (err) {
    status = "failure";
    errorMsg = (err as Error).message;
    logger.error({ err }, "Email send failed");
  }

  await db.insert(emailLogsTable).values({
    recipients: recipientList.join(", "),
    status,
    error: errorMsg ?? null,
    weekStart: report.weekStart,
  });

  if (status === "failure") {
    return { success: false, message: `Odeslání selhalo: ${errorMsg}`, error: errorMsg };
  }

  return {
    success: true,
    message: opts?.isTest
      ? `Testovací e-mail odeslán na: ${recipientList.join(", ")}`
      : `Přehled odeslán na: ${recipientList.join(", ")}`,
  };
}
