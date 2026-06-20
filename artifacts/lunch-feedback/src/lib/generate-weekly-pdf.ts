import jsPDF from "jspdf";
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
  meal === "obed1" ? "Obed 1" : meal === "obed2" ? "Obed 2" : meal;

export function generateWeeklyPdf(report: WeeklyReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const line = (fromX: number, toX: number, atY: number, color = "#e5e7eb") => {
    doc.setDrawColor(color);
    doc.setLineWidth(0.3);
    doc.line(fromX, atY, toX, atY);
  };

  const text = (
    str: string,
    x: number,
    atY: number,
    opts: { size?: number; bold?: boolean; color?: string; align?: "left" | "center" | "right" } = {}
  ) => {
    doc.setFontSize(opts.size ?? 10);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(opts.color ?? "#1a1a1a");
    doc.text(str, x, atY, { align: opts.align ?? "left" });
  };

  const badge = (label: string, x: number, atY: number, bgHex: string, fgHex: string) => {
    const pad = 2.5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const w = doc.getTextWidth(label) + pad * 2;
    doc.setFillColor(bgHex);
    doc.roundedRect(x, atY - 4, w, 5.5, 1, 1, "F");
    doc.setTextColor(fgHex);
    doc.text(label, x + pad, atY);
    return w;
  };

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  const weekLabel = `${format(weekStart, "d. MMMM", { locale: cs })} – ${format(now, "d. MMMM yyyy", { locale: cs })}`;
  const generatedAt = format(now, "d. MMMM yyyy, HH:mm", { locale: cs });

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor("#6abf40");
  doc.rect(0, 0, pageW, 28, "F");

  text("GYMNAZIUM AS", margin, 11, { size: 13, bold: true, color: "#ffffff" });
  text("Zpetna vazba na skolni obedy", margin, 18, { size: 9, color: "#e8f5e9" });

  text("TYDENNY PREGLED", pageW - margin, 11, {
    size: 13,
    bold: true,
    color: "#ffffff",
    align: "right",
  });
  text(weekLabel, pageW - margin, 18, { size: 8, color: "#e8f5e9", align: "right" });

  y = 36;

  // ── Meta row ─────────────────────────────────────────────────────────────
  text(`Datum vygenerovani: ${generatedAt}`, margin, y, { size: 8, color: "#6b7280" });
  y += 10;
  line(margin, pageW - margin, y);
  y += 8;

  // ── Section: Summary ─────────────────────────────────────────────────────
  text("CELKOVY PREHLED", margin, y, { size: 8, bold: true, color: "#6abf40" });
  y += 6;

  // Stat boxes
  const boxW = (contentW - 6) / 4;
  const boxes = [
    { label: "Hodnoceni celkem", value: String(report.totalThisWeek), color: "#6abf40", bg: "#f0fdf4" },
    { label: "Pozitivni", value: `${report.positivePercent}%`, color: "#16a34a", bg: "#f0fdf4" },
    { label: "Neutralni", value: `${report.neutralPercent}%`, color: "#ca8a04", bg: "#fefce8" },
    { label: "Negativni", value: `${report.negativePercent}%`, color: "#dc2626", bg: "#fef2f2" },
  ];

  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 2);
    doc.setFillColor(b.bg);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(b.color);
    doc.text(b.value, x + boxW / 2, y + 13, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#6b7280");
    doc.text(b.label, x + boxW / 2, y + 19, { align: "center" });
  });

  y += 30;
  line(margin, pageW - margin, y);
  y += 8;

  // ── Section: Best & Worst ─────────────────────────────────────────────────
  text("NEJLEPE A NEJHURE HODNOCENY OBED", margin, y, { size: 8, bold: true, color: "#6abf40" });
  y += 6;

  const halfW = (contentW - 4) / 2;

  // Best
  doc.setFillColor("#f0fdf4");
  doc.roundedRect(margin, y, halfW, 18, 2, 2, "F");
  doc.setFillColor("#6abf40");
  doc.circle(margin + 9, y + 9, 5.5, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#ffffff");
  doc.text("*", margin + 7.2, y + 10.5);
  text("Nejlepe hodnoceny", margin + 17, y + 6, { size: 7, color: "#6b7280" });
  text(report.bestMeal ? getMealName(report.bestMeal) : "–", margin + 17, y + 13, {
    size: 12,
    bold: true,
    color: "#15803d",
  });

  // Worst
  const wx = margin + halfW + 4;
  doc.setFillColor("#fef2f2");
  doc.roundedRect(wx, y, halfW, 18, 2, 2, "F");
  doc.setFillColor("#dc2626");
  doc.circle(wx + 9, y + 9, 5.5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#ffffff");
  doc.text("v", wx + 7.5, y + 10.5);
  text("Nejhure hodnoceny", wx + 17, y + 6, { size: 7, color: "#6b7280" });
  text(report.worstMeal ? getMealName(report.worstMeal) : "–", wx + 17, y + 13, {
    size: 12,
    bold: true,
    color: "#b91c1c",
  });

  y += 26;
  line(margin, pageW - margin, y);
  y += 8;

  // ── Section: Rating bar ───────────────────────────────────────────────────
  text("GRAFICKE ZNAZORNENI HODNOCENI", margin, y, { size: 8, bold: true, color: "#6abf40" });
  y += 7;

  const barH = 7;
  const total =
    report.positivePercent + report.neutralPercent + report.negativePercent || 100;

  const segments = [
    { pct: report.positivePercent, color: "#6abf40" },
    { pct: report.neutralPercent, color: "#eab308" },
    { pct: report.negativePercent, color: "#ef4444" },
  ];

  let xCursor = margin;
  segments.forEach(({ pct, color }) => {
    const w = (pct / total) * contentW;
    if (w > 0) {
      doc.setFillColor(color);
      doc.rect(xCursor, y, w, barH, "F");
      xCursor += w;
    }
  });
  // rounded cap effect via clipping is skipped for simplicity

  y += barH + 4;

  const legendItems = [
    { label: `Pozitivni ${report.positivePercent}%`, color: "#6abf40" },
    { label: `Neutralni ${report.neutralPercent}%`, color: "#eab308" },
    { label: `Negativni ${report.negativePercent}%`, color: "#ef4444" },
  ];
  legendItems.forEach((item, i) => {
    const lx = margin + i * 55;
    doc.setFillColor(item.color);
    doc.circle(lx + 2, y - 1, 2, "F");
    text(item.label, lx + 6, y, { size: 8, color: "#374151" });
  });

  y += 12;
  line(margin, pageW - margin, y);
  y += 8;

  // ── Section: Recent comments ──────────────────────────────────────────────
  text("NEJNOVEJSI KOMENTARE", margin, y, { size: 8, bold: true, color: "#6abf40" });
  y += 6;

  if (report.recentComments.length === 0) {
    doc.setFillColor("#f9fafb");
    doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
    text("Tento tyden zatim zadne komentare.", margin + contentW / 2, y + 9, {
      size: 9,
      color: "#9ca3af",
      align: "center",
    });
    y += 20;
  } else {
    report.recentComments.forEach((c, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      const bgColor = idx % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.setFillColor(bgColor);
      doc.setDrawColor("#e5e7eb");
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 18, 2, 2, "FD");

      // Left accent stripe
      const ratingColor =
        c.rating === "positive" ? "#6abf40" : c.rating === "neutral" ? "#eab308" : "#ef4444";
      doc.setFillColor(ratingColor);
      doc.roundedRect(margin, y, 3, 18, 1, 1, "F");

      // Meal & rating badge
      text(getMealName(c.meal), margin + 7, y + 6, { size: 8, bold: true, color: "#1f2937" });

      const ratingLabel =
        c.rating === "positive" ? "Pozitivni" : c.rating === "neutral" ? "Neutralni" : "Negativni";
      const badgeBg =
        c.rating === "positive" ? "#dcfce7" : c.rating === "neutral" ? "#fef9c3" : "#fee2e2";
      const badgeFg =
        c.rating === "positive" ? "#15803d" : c.rating === "neutral" ? "#92400e" : "#b91c1c";
      badge(ratingLabel, margin + 7 + doc.getTextWidth(getMealName(c.meal)) + 4, y + 6, badgeBg, badgeFg);

      // Date
      const dateStr = format(new Date(c.createdAt), "d. M. yyyy, HH:mm", { locale: cs });
      text(dateStr, pageW - margin - 2, y + 6, { size: 7, color: "#9ca3af", align: "right" });

      // Comment text — wrap if needed
      const maxCommentW = contentW - 10;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#374151");
      const wrapped = doc.splitTextToSize(c.comment, maxCommentW);
      doc.text(wrapped[0], margin + 7, y + 13);

      y += 22;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 12;
  line(margin, pageW - margin, footerY - 4, "#e5e7eb");
  text("Gymnazium As – Zpetna vazba na skolni obedy", margin, footerY, {
    size: 7,
    color: "#9ca3af",
  });
  text(`Vygenerovano: ${generatedAt}`, pageW - margin, footerY, {
    size: 7,
    color: "#9ca3af",
    align: "right",
  });

  const filename = `tydenny-pregled-${format(now, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
