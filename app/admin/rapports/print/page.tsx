"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  DEMO_MODE, demoGetTickets, demoGetServices,
} from "@/lib/demo-store";
import {
  Ticket, Service,
  CATEGORY_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  isOverdue,
} from "@/types";
import type { RapportAIResult } from "@/app/api/rapport-ai/route";

// ─── Wrapper with Suspense (required for useSearchParams) ─────────────────

export default function RapportPrintPageWrapper() {
  return (
    <Suspense>
      <RapportPrintPage />
    </Suspense>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

function RapportPrintPage() {
  const searchParams = useSearchParams();

  const reportType = (searchParams.get("type") ?? "journalier") as "journalier" | "mensuel";
  const dateFrom   = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const dateTo     = searchParams.get("to")   ?? new Date().toISOString().slice(0, 10);
  const aiRaw      = searchParams.get("ai");

  const aiResult = useMemo((): RapportAIResult | null => {
    if (!aiRaw) return null;
    try { return JSON.parse(decodeURIComponent(aiRaw)); } catch { return null; }
  }, [aiRaw]);

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setTickets(demoGetTickets(undefined, undefined, undefined, undefined, { includeDuplicates: true }));
      setServices(demoGetServices());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [ready]);

  const filtered = useMemo(() => {
    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
    const to   = new Date(dateTo);   to.setHours(23, 59, 59, 999);
    return tickets.filter((t) => {
      const d = new Date(t.created_at);
      return d >= from && d <= to;
    });
  }, [tickets, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byService:  Record<string, number> = {};

    for (const t of filtered) {
      byCategory[CATEGORY_LABELS[t.categorie]] = (byCategory[CATEGORY_LABELS[t.categorie]] ?? 0) + 1;
      const svcName = services.find((s) => s.id === t.service_id)?.nom ?? "Non assigné";
      byService[svcName] = (byService[svcName] ?? 0) + 1;
    }

    const termine = filtered.filter((t) => t.statut === "termine" || t.statut === "ferme").length;
    const treatRate = filtered.length > 0 ? Math.round((termine / filtered.length) * 100) : 0;
    const overdue   = filtered.filter((t) => isOverdue(t) && t.statut !== "termine" && t.statut !== "ferme").length;
    const urgent    = filtered.filter((t) => t.priorite === "urgente" && t.statut !== "termine" && t.statut !== "ferme").length;
    const avgDays   = filtered.length
      ? filtered.reduce((acc, t) => acc + (Date.now() - new Date(t.created_at).getTime()) / 86400000, 0) / filtered.length
      : 0;

    return {
      total: filtered.length,
      nouveau:  filtered.filter((t) => t.statut === "nouveau").length,
      en_cours: filtered.filter((t) => t.statut === "en_cours").length,
      transmis: filtered.filter((t) => t.statut === "transmis").length,
      termine:  filtered.filter((t) => t.statut === "termine").length,
      ferme:    filtered.filter((t) => t.statut === "ferme").length,
      overdue, urgent, treatRate, avgDays,
      byCategory, byService,
    };
  }, [filtered, services]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  if (!ready) return null;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.2cm 1.5cm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; }
        .page { background: white; }
      `}</style>

      {/* Controls — hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          style={{ background: "#1b5b52", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          🖨️ Imprimer / Sauvegarder PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: "white", border: "1px solid #e2e8f0", color: "#475569", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          ✕ Fermer
        </button>
      </div>

      <div className="page max-w-[800px] mx-auto px-10 py-10 print:p-0 print:max-w-full">

        {/* ══ PAGE 1 ════════════════════════════════════════════════════════ */}

        {/* ── Header branded ─────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #1b5b52 0%, #0d3b34 50%, #162544 100%)",
          borderRadius: 20, padding: "32px 36px", marginBottom: 32, color: "white",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56, height: 56, background: "rgba(255,255,255,0.15)", borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 900,
              }}>
                F
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>Ville de Fresnes</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, marginTop: 2 }}>
                  Gestion des demandes citoyennes
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>
                Rapport {reportType}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                {fmtDate(dateFrom)}
                {dateFrom !== dateTo && <> — {fmtDate(dateTo)}</>}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                Généré le {new Date().toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* KPI row inside header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Demandes",   value: stats.total,   icon: "📋" },
              { label: "Traitées",   value: `${stats.treatRate}%`, icon: "✅" },
              { label: "En retard",  value: stats.overdue, icon: "⏰" },
              { label: "Urgentes",   value: stats.urgent,  icon: "🚨" },
            ].map((k) => (
              <div key={k.label} style={{
                background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Statuts + Délai ─────────────────────────────────────────────── */}
        <SectionTitle>Aperçu des statuts</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 32 }}>
          {[
            { label: "Nouveau",  val: stats.nouveau,  color: "#3b82f6" },
            { label: "En cours", val: stats.en_cours, color: "#f59e0b" },
            { label: "Transmis", val: stats.transmis, color: "#8b5cf6" },
            { label: "Terminé",  val: stats.termine,  color: "#10b981" },
            { label: "Fermé",    val: stats.ferme,    color: "#94a3b8" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bar charts ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
          <PrintBarChart title="Par catégorie" data={stats.byCategory} total={stats.total} color="#1b5b52" />
          <PrintBarChart title="Par service" data={stats.byService} total={stats.total} color="#6366f1" />
        </div>

        {/* ── SVG Donut Status ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
          <PrintDonut
            title="Répartition des statuts"
            data={{
              "Nouveau":  stats.nouveau,
              "En cours": stats.en_cours,
              "Transmis": stats.transmis,
              "Terminé":  stats.termine,
              "Fermé":    stats.ferme,
            }}
            colors={["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#94a3b8"]}
          />
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
              Indicateurs clés
            </div>
            {[
              { icon: "⏱️", label: "Délai moyen de traitement", value: `${stats.avgDays.toFixed(1)} jours` },
              { icon: "✅", label: "Taux de traitement",          value: `${stats.treatRate}%` },
              { icon: "🚨", label: "Demandes urgentes actives",   value: String(stats.urgent) },
              { icon: "⏰", label: "Demandes en retard",           value: String(stats.overdue) },
              { icon: "📋", label: "Total de la période",          value: String(stats.total) },
            ].map((kpi) => (
              <div key={kpi.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{kpi.icon}</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>{kpi.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{kpi.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ PAGE 2 : ANALYSE IA + RÉCENTS ════════════════════════════════ */}
        {aiResult && (
          <div className="page-break">
            <SectionTitle>Analyse IA — Rapport exécutif</SectionTitle>

            {/* Executive summary */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 20, color: "white" }}>
              <div style={{ fontSize: 10, color: "rgba(165,180,252,0.7)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                Résumé exécutif
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(238,242,255,0.9)" }}>
                {aiResult.executive_summary}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Highlights */}
              <div style={{ background: "#f8fafc", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
                  Points saillants
                </div>
                {aiResult.highlights.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 20, height: 20, background: "#e0e7ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#4338ca", flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.5 }}>{h}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "20px 24px", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
                  Recommandations
                </div>
                {aiResult.recommendations.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "white", borderRadius: 10, padding: "8px 12px", marginBottom: 8, border: "1px solid #dcfce7" }}>
                    <span style={{ color: "#16a34a", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>→</span>
                    <p style={{ fontSize: 11.5, color: "#166534", lineHeight: 1.5 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusion */}
            <div style={{ background: "#fafafa", borderRadius: 14, padding: "18px 24px", border: "1px solid #e2e8f0", marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                Conclusion
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontStyle: "italic" }}>
                {aiResult.conclusion}
              </p>
            </div>
          </div>
        )}

        {/* ── Tableau récents ─────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <>
            <SectionTitle>Dernières demandes ({Math.min(filtered.length, 15)} affichées)</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 32 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["#", "Catégorie", "Adresse", "Statut", "Priorité", "Date"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, borderBottom: "2px solid #e2e8f0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 15).map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 10px", color: "#94a3b8", fontWeight: 600, fontFamily: "monospace", fontSize: 10 }}>
                      {t.id.slice(0, 6).toUpperCase()}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: "#334155" }}>
                      {CATEGORY_LABELS[t.categorie]}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.adresse}
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5,
                        background: t.statut === "termine" ? "#d1fae5" : t.statut === "nouveau" ? "#dbeafe" : t.statut === "en_cours" ? "#fef3c7" : "#ede9fe",
                        color: t.statut === "termine" ? "#065f46" : t.statut === "nouveau" ? "#1e40af" : t.statut === "en_cours" ? "#92400e" : "#4c1d95",
                      }}>
                        {STATUS_LABELS[t.statut]}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5,
                        background: t.priorite === "urgente" ? "#fee2e2" : t.priorite === "haute" ? "#ffedd5" : "#f1f5f9",
                        color: t.priorite === "urgente" ? "#991b1b" : t.priorite === "haute" ? "#9a3412" : "#475569",
                      }}>
                        {PRIORITY_LABELS[t.priorite]}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                      {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Pied de page ────────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            Ville de Fresnes — Rapport {reportType} — {fmtDate(dateFrom)}{dateFrom !== dateTo ? ` au ${fmtDate(dateTo)}` : ""}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            Généré par le Portail Mairie
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
      {children}
      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
    </div>
  );
}

function PrintBarChart({
  title, data, total, color,
}: {
  title: string;
  data: Record<string, number>;
  total: number;
  color: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0]?.[1] ?? 1;

  return (
    <div style={{ background: "#f8fafc", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
        {title}
      </div>
      {sorted.map(([label, count]) => {
        const pct  = total > 0 ? Math.round((count / total) * 100) : 0;
        const barW = max > 0 ? (count / max) * 100 : 0;
        return (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: "#334155", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{label}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{count} <span style={{ color: "#cbd5e1" }}>({pct}%)</span></span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barW}%`, background: color, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Aucune donnée.</p>}
    </div>
  );
}

function PrintDonut({
  title, data, colors,
}: {
  title: string;
  data: Record<string, number>;
  colors: string[];
}) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  const cx = 60; const cy = 60; const r = 50; const innerR = 30;
  let cumAngle = -Math.PI / 2;
  const segments = entries.map(([label, val], i) => {
    const angle = total > 0 ? (val / total) * 2 * Math.PI : 0;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const ix1 = cx + innerR * Math.cos(cumAngle - angle);
    const iy1 = cy + innerR * Math.sin(cumAngle - angle);
    const ix2 = cx + innerR * Math.cos(cumAngle);
    const iy2 = cy + innerR * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    return { label, val, color: colors[i % colors.length], d };
  });

  return (
    <div style={{ background: "#f8fafc", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          {total === 0 ? (
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="20" />
          ) : (
            segments.map((seg) => (
              <path key={seg.label} d={seg.d} fill={seg.color} />
            ))
          )}
          <text x="60" y="65" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{total}</text>
        </svg>
        <div style={{ flex: 1 }}>
          {entries.map(([label, val], i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#475569", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>{val}</span>
            </div>
          ))}
          {entries.length === 0 && <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Aucune donnée.</p>}
        </div>
      </div>
    </div>
  );
}
