"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEMO_MODE, demoGetTickets, demoGetServices,
} from "@/lib/demo-store";
import {
  Ticket, Service,
  CATEGORY_LABELS,
  isOverdue,
} from "@/types";
import AdminShell from "@/components/admin/AdminShell";
import type { RapportStats, RapportAIResult } from "@/app/api/rapport-ai/route";

type ReportType = "journalier" | "mensuel";

// ─── Helpers date ────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return toDateStr(new Date());
}

function firstOfMonth() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function addDays(base: string, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function RapportsPage() {

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [reportType, setReportType] = useState<ReportType>("journalier");
  const [dateFrom,   setDateFrom]   = useState(todayStr());
  const [dateTo,     setDateTo]     = useState(todayStr());

  const [aiResult,   setAiResult]   = useState<RapportAIResult | null>(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState("");

  useEffect(() => {
    if (!DEMO_MODE) return;
    setTickets(demoGetTickets(undefined, undefined, undefined, undefined, { includeDuplicates: true }));
    setServices(demoGetServices());
  }, []);

  // Auto-adjust dates when report type changes
  useEffect(() => {
    if (reportType === "journalier") {
      setDateFrom(todayStr());
      setDateTo(todayStr());
    } else {
      setDateFrom(firstOfMonth());
      setDateTo(todayStr());
    }
    setAiResult(null);
    setAiError("");
  }, [reportType]);

  // ── Stats for the selected period ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    return tickets.filter((t) => {
      const d = new Date(t.created_at);
      return d >= from && d <= to;
    });
  }, [tickets, dateFrom, dateTo]);

  const stats = useMemo((): RapportStats => {
    const byCategory: Record<string, number> = {};
    const byService:  Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const t of filtered) {
      byCategory[CATEGORY_LABELS[t.categorie]] = (byCategory[CATEGORY_LABELS[t.categorie]] ?? 0) + 1;
      const svcName = (t.service as Service | undefined)?.nom ?? services.find((s) => s.id === t.service_id)?.nom ?? "Non assigné";
      byService[svcName] = (byService[svcName] ?? 0) + 1;
      byPriority[t.priorite] = (byPriority[t.priorite] ?? 0) + 1;
    }

    const avgAgeDays = filtered.length
      ? filtered.reduce((acc, t) => {
          const diffMs = Date.now() - new Date(t.created_at).getTime();
          return acc + diffMs / (1000 * 60 * 60 * 24);
        }, 0) / filtered.length
      : 0;

    const ratings = filtered.filter((t) => typeof t.rating === "number");
    const satisfactionAvg = ratings.length
      ? ratings.reduce((acc, t) => acc + (t.rating ?? 0), 0) / ratings.length
      : undefined;

    return {
      type:    reportType,
      from:    new Date(dateFrom).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      to:      new Date(dateTo).toLocaleDateString("fr-FR",   { day: "numeric", month: "long", year: "numeric" }),
      total:   filtered.length,
      nouveau: filtered.filter((t) => t.statut === "nouveau").length,
      en_cours:filtered.filter((t) => t.statut === "en_cours").length,
      transmis:filtered.filter((t) => t.statut === "transmis").length,
      termine: filtered.filter((t) => t.statut === "termine").length,
      ferme:   filtered.filter((t) => t.statut === "ferme").length,
      overdue: filtered.filter((t) => isOverdue(t) && t.statut !== "termine" && t.statut !== "ferme").length,
      urgent:  filtered.filter((t) => t.priorite === "urgente" && t.statut !== "termine" && t.statut !== "ferme").length,
      byCategory, byService, byPriority, avgAgeDays, satisfactionAvg,
    };
  }, [filtered, reportType, dateFrom, dateTo, services]);

  // ── Generate AI report ────────────────────────────────────────────────────
  async function generateAI() {
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch("/api/rapport-ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(stats),
      });
      if (!res.ok) throw new Error("Erreur API");
      const data: RapportAIResult = await res.json();
      setAiResult(data);
    } catch {
      setAiError("Impossible de générer l'analyse IA. Vérifiez la connexion.");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Open print page ───────────────────────────────────────────────────────
  function openPrint() {
    const params = new URLSearchParams({
      type:  reportType,
      from:  dateFrom,
      to:    dateTo,
      ai:    aiResult ? encodeURIComponent(JSON.stringify(aiResult)) : "",
    });
    window.open(`/admin/rapports/print?${params.toString()}`, "_blank");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const treatmentRate = stats.total > 0
    ? Math.round(((stats.termine + stats.ferme) / stats.total) * 100)
    : 0;

  return (
    <AdminShell
      title="Rapports IA 📊"
      subtitle="Générez des rapports intelligents à partir de vos données"
      actions={
        <div className="flex gap-2">
          <button
            onClick={generateAI}
            disabled={aiLoading || stats.total === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg shadow"
          >
            {aiLoading ? (
              <><span className="animate-spin">⚙️</span> Analyse en cours…</>
            ) : (
              <>✨ Analyse IA</>
            )}
          </button>
          <button
            onClick={openPrint}
            disabled={stats.total === 0}
            className="flex items-center gap-2 bg-fresnes-700 hover:bg-fresnes-800 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg shadow"
          >
            🖨️ Imprimer / PDF
          </button>
        </div>
      }
    >
      <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── Configurateur ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Configuration du rapport</div>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Type */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200">
                {(["journalier", "mensuel"] as ReportType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setReportType(t)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                      reportType === t
                        ? "bg-fresnes-700 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t === "journalier" ? "📅 Journalier" : "📆 Mensuel"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date from */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Du</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => { setDateFrom(e.target.value); setAiResult(null); }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Au</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={toDateStr(new Date())}
                onChange={(e) => { setDateTo(e.target.value); setAiResult(null); }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
            </div>

            {/* Shortcuts */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Aujourd'hui",   from: todayStr(),       to: todayStr()       },
                { label: "7 derniers j.", from: addDays(todayStr(), -6), to: todayStr() },
                { label: "Ce mois",       from: firstOfMonth(),   to: todayStr()       },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setDateFrom(s.from); setDateTo(s.to); setAiResult(null); }}
                  className="text-xs font-semibold text-slate-500 hover:text-fresnes-700 bg-slate-50 hover:bg-fresnes-50 border border-slate-200 hover:border-fresnes-200 px-3 py-2 rounded-lg transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        {stats.total === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-500 font-semibold text-sm">Aucune demande sur cette période.</p>
            <p className="text-slate-400 text-xs mt-1">Modifiez les dates pour afficher des données.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total demandes"  value={stats.total}    icon="📋" color="slate" />
              <KpiCard label="Traitées"         value={stats.termine + stats.ferme} icon="✅" color="green" sub={`${treatmentRate}%`} />
              <KpiCard label="En cours"         value={stats.en_cours} icon="⚙️" color="amber" />
              <KpiCard label="En retard"        value={stats.overdue}  icon="⏰" color="red"   />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Nouvelles"        value={stats.nouveau}  icon="🆕" color="blue" />
              <KpiCard label="Transmises"       value={stats.transmis} icon="📤" color="violet" />
              <KpiCard label="Urgentes actives" value={stats.urgent}   icon="🚨" color="red" />
              <KpiCard
                label="Délai moyen"
                value={parseFloat(stats.avgAgeDays.toFixed(1))}
                icon="⏱️"
                color="slate"
                sub="jours"
              />
            </div>

            {/* ── Charts ─────────────────────────────────────────────── */}
            <div className="grid sm:grid-cols-2 gap-5">
              <BarChart
                title="Par catégorie"
                data={stats.byCategory}
                total={stats.total}
                colorClass="bg-fresnes-500"
              />
              <BarChart
                title="Par service"
                data={stats.byService}
                total={stats.total}
                colorClass="bg-indigo-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <DonutChart
                title="Répartition des statuts"
                data={{
                  "Nouveau":   stats.nouveau,
                  "En cours":  stats.en_cours,
                  "Transmis":  stats.transmis,
                  "Terminé":   stats.termine,
                  "Fermé":     stats.ferme,
                }}
                colors={["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#94a3b8"]}
              />
              <DonutChart
                title="Répartition des priorités"
                data={{
                  "Urgente": stats.byPriority["urgente"] ?? 0,
                  "Haute":   stats.byPriority["haute"]   ?? 0,
                  "Normale": stats.byPriority["normale"] ?? 0,
                  "Faible":  stats.byPriority["faible"]  ?? 0,
                }}
                colors={["#ef4444", "#f97316", "#3b82f6", "#94a3b8"]}
              />
            </div>

            {/* ── Analyse IA ─────────────────────────────────────────── */}
            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
                ⚠️ {aiError}
              </div>
            )}

            {aiLoading && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center">
                <div className="text-3xl mb-3 animate-spin inline-block">✨</div>
                <p className="text-indigo-700 font-semibold text-sm">L&apos;IA analyse vos données…</p>
                <p className="text-indigo-500 text-xs mt-1">Génération du rapport en cours, veuillez patienter.</p>
              </div>
            )}

            {aiResult && !aiLoading && (
              <AIReportCard result={aiResult} stats={stats} />
            )}

            {!aiResult && !aiLoading && (
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">✨</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-indigo-900">Analyse IA disponible</div>
                  <p className="text-xs text-indigo-700/80 mt-1">
                    Cliquez sur <strong>Analyse IA</strong> pour générer un rapport exécutif complet avec résumé, points saillants et recommandations opérationnelles.
                  </p>
                </div>
                <button
                  onClick={generateAI}
                  disabled={aiLoading}
                  className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow disabled:opacity-50"
                >
                  ✨ Générer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

// ─── Composants ──────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color, sub,
}: {
  label: string; value: number; icon: string; color: string; sub?: string;
}) {
  const styles: Record<string, string> = {
    slate:  "from-slate-50 to-slate-100/50 border-slate-200 text-slate-800",
    blue:   "from-blue-50 to-blue-100/50 border-blue-200 text-blue-800",
    amber:  "from-amber-50 to-amber-100/50 border-amber-200 text-amber-800",
    red:    "from-red-50 to-red-100/50 border-red-200 text-red-800",
    green:  "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-800",
    violet: "from-violet-50 to-violet-100/50 border-violet-200 text-violet-800",
  };
  return (
    <div className={`bg-gradient-to-br ${styles[color]} border rounded-2xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-2xl font-black leading-none">{value}</div>
        {sub && <div className="text-xs font-bold opacity-60">{sub}</div>}
      </div>
      <div className="text-[11px] font-semibold mt-1 opacity-70 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function BarChart({
  title, data, total, colorClass,
}: {
  title: string;
  data: Record<string, number>;
  total: number;
  colorClass: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0]?.[1] ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{title}</div>
      <div className="flex flex-col gap-2.5">
        {sorted.map(([label, count]) => {
          const pct  = total > 0 ? Math.round((count / total) * 100) : 0;
          const barW = max > 0 ? (count / max) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-700 font-semibold truncate flex-1">{label}</span>
                <span className="text-xs font-bold text-slate-500">
                  {count} <span className="text-slate-300">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colorClass} transition-all`}
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-xs text-slate-400 italic">Aucune donnée.</p>
        )}
      </div>
    </div>
  );
}

function DonutChart({
  title, data, colors,
}: {
  title: string;
  data: Record<string, number>;
  colors: string[];
}) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const entries = Object.entries(data).filter(([, v]) => v > 0);

  // Build SVG arc path
  const cx = 60; const cy = 60; const r = 45; const innerR = 28;
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{title}</div>
      <div className="flex items-center gap-5">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {total === 0 ? (
            <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="17" />
          ) : (
            segments.map((seg) => (
              <path key={seg.label} d={seg.d} fill={seg.color} />
            ))
          )}
          <text x="60" y="63" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
        </svg>
        <div className="flex-1 flex flex-col gap-1.5">
          {entries.map(([label, val], i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs text-slate-600 flex-1 truncate">{label}</span>
              <span className="text-xs font-bold text-slate-700">{val}</span>
            </div>
          ))}
          {entries.length === 0 && <p className="text-xs text-slate-400 italic">Aucune donnée.</p>}
        </div>
      </div>
    </div>
  );
}

function AIReportCard({ result, stats }: { result: RapportAIResult; stats: RapportStats }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-800/40 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center text-xl">✨</div>
        <div>
          <div className="text-sm font-bold text-white">Rapport IA — {stats.type === "journalier" ? "Journalier" : "Mensuel"}</div>
          <div className="text-xs text-indigo-300/60">Du {stats.from} au {stats.to}</div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Executive summary */}
        <div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Résumé exécutif</div>
          <p className="text-sm text-indigo-50/90 leading-relaxed">{result.executive_summary}</p>
        </div>

        {/* Highlights */}
        <div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Points saillants</div>
          <div className="flex flex-col gap-2">
            {result.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-indigo-500/20 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-300 flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-indigo-100/80 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Recommandations opérationnelles</div>
          <div className="flex flex-col gap-2">
            {result.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3">
                <span className="text-indigo-400 text-sm flex-shrink-0">→</span>
                <p className="text-xs text-indigo-100/80 leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className="border-t border-white/10 pt-4">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Conclusion</div>
          <p className="text-xs text-indigo-200/70 leading-relaxed italic">{result.conclusion}</p>
        </div>
      </div>
    </div>
  );
}
