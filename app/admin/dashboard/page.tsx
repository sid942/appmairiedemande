"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE, demoGetTickets, demoGetServices } from "@/lib/demo-store";
import { Ticket, Service, isOverdue, getDaysOld, CATEGORY_LABELS } from "@/types";
import AdminShell from "@/components/admin/AdminShell";
import TrendChart from "@/components/admin/charts/TrendChart";

// ── Données de référence ──────────────────────────────────────────────────

const SERVICE_META: Record<string, { icon: string }> = {
  "svc-1": { icon: "🔧" },
  "svc-2": { icon: "♻️" },
  "svc-3": { icon: "🛣️" },
  "svc-4": { icon: "🌿" },
  "svc-5": { icon: "🏛️" },
};

// Tendance démo déterministe 30j
function buildDemoTrend(): number[] {
  return Array.from({ length: 30 }, (_, i) => {
    const base  = 4 + Math.sin(i * 0.4) * 2.5;
    const noise = Math.sin(i * 13.7 + 5.3) * 1.5 + Math.sin(i * 3.1) * 1;
    return Math.max(0, Math.round(base + noise));
  });
}

function buildDateLabels(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  });
}

// Delta démo déterministe
function demoDelta(base: number, seed: number): number {
  return Math.round(base * (Math.sin(seed) * 0.3 + 0.05));
}

// ── Statut global ────────────────────────────────────────────────────────

type GlobalStatus = "performant" | "surveiller" | "critique";

function computeStatus(pct: number, overdue: number, delay: number | null): GlobalStatus {
  let score = 0;
  if (pct >= 70) score += 2; else if (pct >= 50) score += 1;
  if (overdue === 0) score += 2; else if (overdue <= 2) score += 1;
  if (delay !== null) {
    if (delay <= 3) score += 2; else if (delay <= 6) score += 1;
  } else {
    score += 1;
  }
  if (score >= 5) return "performant";
  if (score >= 3) return "surveiller";
  return "critique";
}

const STATUS_CONFIG: Record<GlobalStatus, {
  label: string; badge: string; dot: string; desc: string;
}> = {
  performant: {
    label: "Performant",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    desc: "Les indicateurs sont dans les normes.",
  },
  surveiller: {
    label: "À surveiller",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
    desc: "Quelques points d'attention à surveiller.",
  },
  critique: {
    label: "Attention requise",
    badge: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
    desc: "Des actions correctives sont nécessaires.",
  },
};

// ─────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mounted,  setMounted]  = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!DEMO_MODE) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push("/admin");
      });
      Promise.all([
        fetch("/api/tickets").then((r) => r.json()),
        fetch("/api/services").then((r) => r.json()),
      ]).then(([t, s]) => { setTickets(t); setServices(s); });
    } else {
      setTickets(demoGetTickets());
      setServices(demoGetServices());
    }
  }, [router]);

  if (!mounted) return null;

  // ── Calculs ───────────────────────────────────────────────────────────

  const total    = tickets.length;
  const resolved = tickets.filter((t) => ["termine", "ferme"].includes(t.statut));
  const overdue  = tickets.filter((t) => isOverdue(t));
  const active   = tickets.filter((t) => !["ferme"].includes(t.statut));
  const pct      = total > 0 ? Math.round((resolved.length / total) * 100) : 0;

  const avgDelay = (() => {
    const w = resolved.filter((t) => t.updated_at);
    if (!w.length) return null;
    return Math.round(w.reduce((s, t) => s + getDaysOld(t.created_at), 0) / w.length * 10) / 10;
  })();

  const globalStatus = computeStatus(pct, overdue.length, avgDelay);
  const sc = STATUS_CONFIG[globalStatus];

  // Deltas (démo: déterministe / prod: todo API)
  const deltaTotalDiff   = DEMO_MODE ? demoDelta(total, 1.2)    : 0;
  const deltaPctDiff     = DEMO_MODE ? demoDelta(pct, 2.7)      : 0;
  const deltaDelayDiff   = DEMO_MODE ? demoDelta(avgDelay ?? 0, 3.5) * -1 : 0;
  const deltaOverdueDiff = DEMO_MODE ? demoDelta(overdue.length + 1, 0.8) * -1 : 0;

  // Services
  const serviceData = services
    .map((svc) => {
      const sTickets = tickets.filter((t) => t.service_id === svc.id);
      const sActive  = sTickets.filter((t) => !["ferme"].includes(t.statut));
      const share    = total > 0 ? Math.round((sTickets.length / total) * 100) : 0;
      return { svc, total: sTickets.length, active: sActive.length, share, meta: SERVICE_META[svc.id] ?? { icon: "📋" } };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxService = Math.max(...serviceData.map((s) => s.total), 1);

  // Top catégories
  const catMap: Record<string, number> = {};
  tickets.forEach((t) => { catMap[t.categorie] = (catMap[t.categorie] ?? 0) + 1; });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({
      key,
      label: CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? key,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  const maxCat = topCats[0]?.count ?? 1;

  // Tendance
  const trendLabels = buildDateLabels();
  const trendData   = DEMO_MODE
    ? buildDemoTrend()
    : Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const s = new Date(d); s.setHours(0,0,0,0);
        const e = new Date(d); e.setHours(23,59,59,999);
        return tickets.filter((t) => { const dt = new Date(t.created_at); return dt >= s && dt <= e; }).length;
      });

  const trendAvg   = Math.round(trendData.reduce((a, b) => a + b, 0) / trendData.length * 10) / 10;
  const trendTotal = trendData.reduce((a, b) => a + b, 0);

  // Date
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <AdminShell title="" subtitle="">
      <div className="min-h-full bg-slate-50">

        {/* ── Bandeau institutionnel ──────────────────────────────────── */}
        <div className="bg-white border-b border-slate-100 px-8 py-5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-5 bg-blue-900 rounded-full" />
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Tableau de bord directeur
                </h1>
              </div>
              <p className="text-xs text-slate-400 pl-3">{todayCap}</p>
            </div>

            {/* Statut global */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Statut global
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{sc.desc}</div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${sc.badge}`}>
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                {sc.label}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-7 max-w-5xl mx-auto flex flex-col gap-7">

          {/* ── KPIs ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              value={String(total)}
              label="Demandes reçues"
              delta={deltaTotalDiff}
              deltaLabel="vs sem. préc."
              deltaInvert={false}
            />
            <KpiCard
              value={`${pct} %`}
              label="Taux de traitement"
              delta={deltaPctDiff}
              deltaLabel="vs sem. préc."
              deltaUnit="pt"
              deltaInvert={false}
              highlight={pct >= 70}
            />
            <KpiCard
              value={avgDelay !== null ? `${avgDelay} j` : "—"}
              label="Délai moyen"
              delta={deltaDelayDiff}
              deltaLabel="vs sem. préc."
              deltaUnit="j"
              deltaInvert={true}
              sub="de traitement"
            />
            <KpiCard
              value={String(overdue.length)}
              label="En retard"
              delta={deltaOverdueDiff}
              deltaLabel="vs sem. préc."
              deltaInvert={true}
              muted={overdue.length === 0}
            />
          </div>

          {/* ── Services + Catégories ─────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Répartition par service */}
            <Panel
              title="Demandes par service"
              sub={`${active.length} demandes actives`}
            >
              <div className="flex flex-col gap-5">
                {serviceData.map(({ svc, total: cnt, share, meta }) => (
                  <div key={svc.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 truncate pr-2">{svc.nom}</span>
                        <div className="flex items-baseline gap-1.5 flex-shrink-0">
                          <span className="text-base font-bold text-slate-900">{cnt}</span>
                          <span className="text-xs text-slate-400">{share}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-900 rounded-full transition-all duration-1000"
                          style={{ width: `${(cnt / maxService) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {serviceData.length === 0 && (
                  <p className="text-sm text-slate-400 py-4 text-center">Aucune donnée</p>
                )}
              </div>
            </Panel>

            {/* Top problèmes */}
            <Panel
              title="Problèmes les plus fréquents"
              sub="Top 5 catégories"
            >
              <div className="flex flex-col gap-5">
                {topCats.map(({ key, label, count, pct: p }, idx) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-5 text-center text-xs font-bold text-slate-300 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 truncate pr-2">{label}</span>
                        <div className="flex items-baseline gap-1.5 flex-shrink-0">
                          <span className="text-base font-bold text-slate-900">{count}</span>
                          <span className="text-xs text-slate-400">{p}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${(count / maxCat) * 100}%`,
                            background: idx === 0 ? "#1e3a8a" : idx === 1 ? "#334155" : "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {topCats.length === 0 && (
                  <p className="text-sm text-slate-400 py-4 text-center">Aucune donnée</p>
                )}
              </div>
            </Panel>
          </div>

          {/* ── Tendance 30 jours ─────────────────────────────────────── */}
          <Panel
            title="Évolution des demandes"
            sub={`30 derniers jours · Moyenne ${trendAvg} / jour · ${trendTotal} reçues`}
          >
            <TrendChart data={trendData} labels={trendLabels} color="#1e3a8a" showAverage />
          </Panel>

        </div>
      </div>
    </AdminShell>
  );
}

// ── Composants ───────────────────────────────────────────────────────────

function KpiCard({
  value, label, delta, deltaLabel, deltaUnit = "", deltaInvert, sub, highlight, muted,
}: {
  value: string;
  label: string;
  delta?: number;
  deltaLabel?: string;
  deltaUnit?: string;
  deltaInvert?: boolean;  // true = une baisse est positive (ex: retards, délai)
  sub?: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  const isPositive = delta !== undefined
    ? (deltaInvert ? delta < 0 : delta > 0)
    : null;

  return (
    <div className={`bg-white rounded-2xl border px-6 py-6 flex flex-col gap-3 ${
      highlight ? "border-blue-100" : "border-slate-100"
    }`}>
      <div className={`text-4xl font-black leading-none tracking-tight ${
        muted ? "text-slate-300" : highlight ? "text-blue-900" : "text-slate-900"
      }`}>
        {value}
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>

      {delta !== undefined && delta !== 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isPositive ? "text-emerald-600" : "text-rose-500"
        }`}>
          <span className="text-sm leading-none">
            {delta > 0 ? "▲" : "▼"}
          </span>
          <span>
            {delta > 0 ? "+" : ""}{delta}{deltaUnit}
          </span>
          <span className="text-slate-400 font-normal">{deltaLabel}</span>
        </div>
      )}
      {delta === 0 && deltaLabel && (
        <div className="text-xs text-slate-400">= stable {deltaLabel}</div>
      )}
    </div>
  );
}

function Panel({
  title, sub, children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-50">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
