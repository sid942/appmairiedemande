"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_MODE, demoGetAgentSession, demoGetAgentTickets,
} from "@/lib/demo-store";
import {
  Ticket, TicketStatus,
  STATUS_LABELS, STATUS_COLORS,
  CATEGORY_LABELS, CATEGORY_ICONS,
  PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_DOT,
  getAgeLabel, getDaysOld, isOverdue,
} from "@/types";
import AgentShell from "@/components/agent/AgentShell";

type FilterTab = TicketStatus | "all" | "overdue";

const TABS: { value: FilterTab; label: string; emoji: string }[] = [
  { value: "all",      label: "Toutes",    emoji: "📋" },
  { value: "nouveau",  label: "Nouvelles", emoji: "🆕" },
  { value: "en_cours", label: "En cours",  emoji: "⚙️" },
  { value: "transmis", label: "Transmis",  emoji: "📤" },
  { value: "overdue",  label: "En retard", emoji: "⏰" },
  { value: "termine",  label: "Terminées", emoji: "✅" },
];

const PRIO_ORDER: Record<string, number> = { urgente: 0, haute: 1, normale: 2, faible: 3 };

export default function AgentDashboard() {
  const router = useRouter();
  const [tickets,   setTickets]   = useState<Ticket[]>([]);
  const [tab,       setTab]       = useState<FilterTab>("all");
  const [search,    setSearch]    = useState("");
  const [agentName, setAgentName] = useState("");

  useEffect(() => {
    if (!DEMO_MODE) return;
    const session = demoGetAgentSession();
    if (!session) return; // AgentShell redirige
    setAgentName(session.agent_nom);
    setTickets(demoGetAgentTickets(session.agent_id));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    tickets.length,
    nouveau:  tickets.filter((t) => t.statut === "nouveau").length,
    en_cours: tickets.filter((t) => t.statut === "en_cours").length,
    overdue:  tickets.filter((t) => isOverdue(t) && t.statut !== "termine" && t.statut !== "ferme").length,
    termine:  tickets.filter((t) => t.statut === "termine").length,
    urgent:   tickets.filter((t) => t.priorite === "urgente" && t.statut !== "termine" && t.statut !== "ferme").length,
  }), [tickets]);

  // ── Filtrage ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...tickets];
    if (tab === "overdue") {
      list = list.filter((t) => isOverdue(t) && t.statut !== "termine" && t.statut !== "ferme");
    } else if (tab !== "all") {
      list = list.filter((t) => t.statut === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.adresse.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q),
      );
    }
    // Tri : urgences + retards en premier, puis date
    list.sort((a, b) => {
      const prioA = PRIO_ORDER[a.priorite] ?? 3;
      const prioB = PRIO_ORDER[b.priorite] ?? 3;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [tickets, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const s of ["nouveau", "en_cours", "transmis", "termine"] as TicketStatus[]) {
      c[s] = tickets.filter((t) => t.statut === s).length;
    }
    c["overdue"] = stats.overdue;
    return c;
  }, [tickets, stats.overdue]);

  return (
    <AgentShell
      title={`Bonjour, ${agentName.split(" ")[0]} 👋`}
      subtitle={`${stats.total} demande${stats.total > 1 ? "s" : ""} assignée${stats.total > 1 ? "s" : ""} · ${stats.en_cours} en cours`}
    >
      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="À traiter"
          value={stats.nouveau}
          color="blue"
          icon="🆕"
          onClick={() => setTab("nouveau")}
          active={tab === "nouveau"}
        />
        <KpiCard
          label="En cours"
          value={stats.en_cours}
          color="amber"
          icon="⚙️"
          onClick={() => setTab("en_cours")}
          active={tab === "en_cours"}
        />
        <KpiCard
          label="En retard"
          value={stats.overdue}
          color="red"
          icon="⏰"
          onClick={() => setTab("overdue")}
          active={tab === "overdue"}
        />
        <KpiCard
          label="Terminées"
          value={stats.termine}
          color="green"
          icon="✅"
          onClick={() => setTab("termine")}
          active={tab === "termine"}
        />
      </div>

      {/* Alerte urgences */}
      {stats.urgent > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-lg">🚨</span>
          <div className="flex-1">
            <span className="text-sm font-bold text-red-800">
              {stats.urgent} demande{stats.urgent > 1 ? "s" : ""} urgente{stats.urgent > 1 ? "s" : ""}
            </span>
            <span className="text-xs text-red-600 ml-2">— À traiter en priorité</span>
          </div>
        </div>
      )}

      {/* ── Tabs + recherche ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {TABS.map((t) => {
            const count  = counts[t.value] ?? 0;
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher (adresse, description, #ID)…"
          className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40"
        />
      </div>

      {/* ── Liste des tâches ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-slate-600 font-semibold text-sm">
            {tab === "all" ? "Aucune demande assignée pour l'instant." : "Aucune demande dans cette catégorie."}
          </p>
          {tab !== "all" && (
            <button onClick={() => setTab("all")} className="mt-2 text-xs text-indigo-600 hover:underline">
              Voir toutes les demandes
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              ticket={t}
              onClick={() => router.push(`/agent/tickets/${t.id}`)}
            />
          ))}
        </div>
      )}
    </AgentShell>
  );
}

// ─── Composants ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon, onClick, active }: {
  label: string; value: number; color: string; icon: string;
  onClick: () => void; active: boolean;
}) {
  const styles: Record<string, string> = {
    blue:  "from-blue-50 to-blue-100/50 border-blue-200 text-blue-800",
    amber: "from-amber-50 to-amber-100/50 border-amber-200 text-amber-800",
    red:   "from-red-50 to-red-100/50 border-red-200 text-red-800",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-800",
  };
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${styles[color]} border rounded-2xl p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ${active ? "ring-2 ring-indigo-400 shadow-md" : ""}`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="text-[11px] font-semibold mt-1 opacity-70 uppercase tracking-wide">{label}</div>
    </button>
  );
}

function TaskCard({ ticket: t, onClick }: { ticket: Ticket; onClick: () => void }) {
  const late  = isOverdue(t);
  const days  = getDaysOld(t.created_at);
  const isDone = t.statut === "termine" || t.statut === "ferme";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 p-4 flex items-start gap-4 ${
        late && !isDone ? "border-red-200" : "border-slate-200 hover:border-indigo-200"
      }`}
    >
      {/* Icône catégorie */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${late && !isDone ? "bg-red-50" : "bg-indigo-50"}`}>
        {CATEGORY_ICONS[t.categorie]}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-bold text-slate-900">{CATEGORY_LABELS[t.categorie]}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[t.statut]}`}>
            {STATUS_LABELS[t.statut]}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priorite]}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PRIORITY_DOT[t.priorite]}`} />
            {PRIORITY_LABELS[t.priorite]}
          </span>
          {late && !isDone && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              ⏰ +{days}j retard
            </span>
          )}
          {t.dispatched_at && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              📧 Reçu
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 truncate mb-1">📍 {t.adresse}</div>
        <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{t.description}</div>

        {/* Contact citoyen */}
        {t.contact && (
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
            <span>👤 {t.nom ?? t.contact}</span>
            <span>·</span>
            <span className="font-medium text-slate-500">{t.contact}</span>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-[11px] text-slate-400 font-mono">{getAgeLabel(t.created_at)}</span>
        <span className="text-slate-300">→</span>
      </div>
    </button>
  );
}
