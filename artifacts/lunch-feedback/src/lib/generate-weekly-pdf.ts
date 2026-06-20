import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface WeeklyReportComment {
  meal: string;
  rating: string;
  comment: string;
  createdAt: string;
}

interface WeeklyReportData {
  totalThisWeek: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  bestMeal: string | null;
  worstMeal: string | null;
  recentComments: WeeklyReportComment[];
}

const getMealName = (meal: string) =>
  meal === "obed1" ? "Oběd 1" : meal === "obed2" ? "Oběd 2" : meal;

const getRatingLabel = (rating: string) =>
  rating === "positive" ? "Pozitivní" : rating === "neutral" ? "Neutrální" : "Negativní";

const getRatingColor = (rating: string) =>
  rating === "positive" ? "#16a34a" : rating === "neutral" ? "#ca8a04" : "#dc2626";

const getRatingBg = (rating: string) =>
  rating === "positive" ? "#dcfce7" : rating === "neutral" ? "#fef9c3" : "#fee2e2";

const getRatingBar = (rating: string) =>
  rating === "positive" ? "#6abf40" : rating === "neutral" ? "#eab308" : "#ef4444";

function buildReportHtml(report: WeeklyReportData, weekLabel: string, generatedAt: string): string {
  const commentsHtml =
    report.recentComments.length === 0
      ? `<div style="background:#f9fafb;border-radius:8px;padding:20px;text-align:center;color:#9ca3af;font-size:13px;">
           Tento týden zatím žádné komentáře.
         </div>`
      : report.recentComments
          .map(
            (c) => `
          <div style="display:flex;gap:0;background:#f9fafb;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:10px;">
            <div style="width:4px;background:${getRatingBar(c.rating)};flex-shrink:0;"></div>
            <div style="flex:1;padding:10px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:700;font-size:13px;color:#1f2937;">${getMealName(c.meal)}</span>
                  <span style="font-size:11px;font-weight:600;color:${getRatingColor(c.rating)};background:${getRatingBg(c.rating)};padding:2px 8px;border-radius:999px;">
                    ${getRatingLabel(c.rating)}
                  </span>
                </div>
                <span style="font-size:11px;color:#9ca3af;">${format(new Date(c.createdAt), "d. M. yyyy, HH:mm", { locale: cs })}</span>
              </div>
              <div style="font-size:13px;color:#374151;">${escapeHtml(c.comment)}</div>
            </div>
          </div>`
          )
          .join("");

  const bestSection = report.bestMeal
    ? `<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
         <div style="width:36px;height:36px;background:#6abf40;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
           <span style="color:white;font-size:18px;line-height:1;">★</span>
         </div>
         <div>
           <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Nejlépe hodnocený</div>
           <div style="font-size:16px;font-weight:700;color:#15803d;">${getMealName(report.bestMeal)}</div>
         </div>
       </div>`
    : `<div style="flex:1;"></div>`;

  const worstSection = report.worstMeal
    ? `<div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
         <div style="width:36px;height:36px;background:#dc2626;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
           <span style="color:white;font-size:18px;line-height:1;">▼</span>
         </div>
         <div>
           <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Nejhůře hodnocený</div>
           <div style="font-size:16px;font-weight:700;color:#b91c1c;">${getMealName(report.worstMeal)}</div>
         </div>
       </div>`
    : `<div style="flex:1;"></div>`;

  return `
    <div style="
      font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
      width: 794px;
      background: white;
      color: #1a1a1a;
    ">
      <!-- Header -->
      <div style="background:#6abf40;padding:20px 30px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:18px;font-weight:700;color:white;letter-spacing:0.5px;">GYMNÁZIUM AŠ</div>
          <div style="font-size:12px;color:#e8f5e9;margin-top:2px;">Zpětná vazba na školní obědy</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:700;color:white;">TÝDENNÍ PŘEHLED</div>
          <div style="font-size:12px;color:#e8f5e9;margin-top:2px;">${weekLabel}</div>
        </div>
      </div>

      <div style="padding:24px 30px;">

        <!-- Generation date -->
        <div style="font-size:11px;color:#6b7280;margin-bottom:12px;">
          Datum vygenerování: ${generatedAt}
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">

        <!-- Summary section -->
        <div style="font-size:11px;font-weight:700;color:#6abf40;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">
          Celkový přehled
        </div>
        <div style="display:flex;gap:10px;margin-bottom:24px;">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#6abf40;">${report.totalThisWeek}</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">Hodnocení celkem</div>
          </div>
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#16a34a;">${report.positivePercent}%</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">Pozitivní</div>
          </div>
          <div style="flex:1;background:#fefce8;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ca8a04;">${report.neutralPercent}%</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">Neutrální</div>
          </div>
          <div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#dc2626;">${report.negativePercent}%</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;">Negativní</div>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">

        <!-- Best & Worst -->
        <div style="font-size:11px;font-weight:700;color:#6abf40;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">
          Nejlépe a nejhůře hodnocený oběd
        </div>
        <div style="display:flex;gap:10px;margin-bottom:24px;">
          ${bestSection}
          ${worstSection}
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">

        <!-- Rating bar -->
        <div style="font-size:11px;font-weight:700;color:#6abf40;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">
          Grafické znázornění hodnocení
        </div>
        <div style="height:14px;border-radius:7px;overflow:hidden;display:flex;margin-bottom:10px;background:#f3f4f6;">
          ${report.positivePercent > 0 ? `<div style="width:${report.positivePercent}%;background:#6abf40;"></div>` : ""}
          ${report.neutralPercent > 0 ? `<div style="width:${report.neutralPercent}%;background:#eab308;"></div>` : ""}
          ${report.negativePercent > 0 ? `<div style="width:${report.negativePercent}%;background:#ef4444;"></div>` : ""}
        </div>
        <div style="display:flex;gap:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:#6abf40;"></div>
            <span style="font-size:12px;color:#374151;">Pozitivní ${report.positivePercent}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:#eab308;"></div>
            <span style="font-size:12px;color:#374151;">Neutrální ${report.neutralPercent}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;"></div>
            <span style="font-size:12px;color:#374151;">Negativní ${report.negativePercent}%</span>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">

        <!-- Comments -->
        <div style="font-size:11px;font-weight:700;color:#6abf40;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">
          Nejnovější komentáře
        </div>
        ${commentsHtml}

        <!-- Footer -->
        <hr style="border:none;border-top:1px solid #e5e7eb;margin-top:24px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
          <span>Gymnázium Aš – Zpětná vazba na školní obědy</span>
          <span>Vygenerováno: ${generatedAt}</span>
        </div>

      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateWeeklyPdf(report: WeeklyReportData): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  const weekLabel = `${format(weekStart, "d. MMMM", { locale: cs })} – ${format(now, "d. MMMM yyyy", { locale: cs })}`;
  const generatedAt = format(now, "d. MMMM yyyy, HH:mm", { locale: cs });

  // Create an off-screen container
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:794px;z-index:-1;pointer-events:none;";
  container.innerHTML = buildReportHtml(report, weekLabel, generatedAt);
  document.body.appendChild(container);

  try {
    // A4 page dimensions in px at 96dpi
    const A4_W = 794;
    const A4_H = 1123;

    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: A4_W,
      windowWidth: A4_W,
    });

    const imgData = canvas.toDataURL("image/png");
    const canvasH = canvas.height;
    const canvasW = canvas.width;

    // Scale: how many canvas-pixels fit into one mm on A4 (210mm wide)
    const mmPerPx = 210 / canvasW;
    const pageHeightPx = A4_H * 2; // scale 2x
    const totalPages = Math.ceil(canvasH / pageHeightPx);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageH = 297; // A4 height in mm

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) doc.addPage();

      // Crop and draw the slice for this page
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvasW;
      sliceCanvas.height = pageHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, -i * pageHeightPx);

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceHmm = sliceCanvas.height * mmPerPx;
      doc.addImage(sliceData, "PNG", 0, 0, 210, sliceHmm);
    }

    const filename = `tydenny-pregled-${format(now, "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
