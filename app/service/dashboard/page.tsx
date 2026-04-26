"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_MODE, demoGetTickets, demoGetServiceSession,
} from "@/lib/demo-store";
import {
  Ticket, TicketStatus,
  STATUS_LABELS, STATUS_COLORS,
  CATEGORY_LABELS, CATEGORY_ICONS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  getAgeLabel, isOverdue,
} from "@/types";
import ServiceShell from "@/components/service/ServiceShell";

const TABS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all",       label: "Toutes" },
  { value: "nouveau",   label: "Nouvelles" },
  { value: "en_cours",  label: "En cours" },
  { value: "transmis",  label: "Transmises" },
  { value: "termine",   label: "Terminées" },
];

export default function ServiceDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<TicketStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) return;
    const session = demoGetServiceSession();
    if (!session) return; // ServiceShell redirige
    setServiceId(session.service_id);
    setTickets(demoGetTickets(undefined, session.service_id));
  }, []);

  const filtered = useMemo(() => {
    let list = tickets;
    if (tab !== "all") list = list.filter((t) => t.statut === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.adresse.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tickets, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const s of ["nouveau", "en_cours", "transmis", "termine"] as TicketStatus[]) {
      c[s] = tickets.filter((t) => t.statut === s).length;
    }
    return c;
  }, [tickets]);

  const dispatched = useMemo(
    () => tickets.filter((t) => t.dispatched_at && t.statut !== "termine" && t.statut !== "ferme"),
    [tickets],
  );

  if (!serviceId) return null;

  return (
    <ServiceShell
      title="Demandes de mon service"
      subtitle={`${tickets.length} demande${tickets.length > 1 ? "s" : ""} attribuée${tickets.length > 1 ? "s" : ""} à votre équipe`}
    >
      {/* Bandeau dispatch récents */}
      {dispatched.length > 0 && (
        <div className="bg-gradient-to-br from-fresnes-50 to-white border border-fresnes-100 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-fresnes-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">
            📧
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-fresnes-800">
              {dispatched.length} demande{dispatched.length > 1 ? "s" : ""} reçue{dispatched.length > 1 ? "s" : ""} par e-mail
            </div>
            <div className="text-xs text-fresnes-700/70 mt-0.5">
              Cliquez sur une demande pour la traiter et mettre à jour son statut.
            </div>
          </div>
        </div>
      )}

      {/* Tabs + recherche */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
          {TABS.map((t) => {
            const active = tab === t.value;
            const count = counts[t.value] ?? 0;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  active ? "bg-fresnes-500 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
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
          placeholder="Rechercher (adresse, description, #ID)…"
          className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-500 text-sm">Aucune demande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/service/tickets/${t.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-fresnes-300 hover:shadow-md transition-all p-4 flex items-start gap-4"
            >
              <div className="w-11 h-11 bg-fresnes-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {CATEGORY_ICONS[t.categorie]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {CATEGORY_LABELS[t.categorie]}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[t.statut]}`}>
                    {STATUS_LABELS[t.statut]}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priorite]}`}>
                    {PRIORITY_LABELS[t.priorite]}
                  </span>
                  {isOverdue(t) && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      ⏰ Retard
                    </span>
                  )}
                  {t.dispatched_at && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fresnes-100 text-fresnes-700">
                      📧 Reçu par e-mail
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{t.adresse}</div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</div>
              </div>
              <div className="text-[11px] text-slate-400 flex-shrink-0 font-mono">
                {getAgeLabel(t.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </ServiceShell>
  );
}
