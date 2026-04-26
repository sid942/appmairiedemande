"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEMO_MODE,
  demoGetTickets, demoGetServices, demoGetAgents, demoUpdateTicket,
  demoArchiveTicket, demoUnarchiveTicket, demoDeleteTicket,
} from "@/lib/demo-store";
import {
  Ticket, Service, Agent,
  TicketStatus, TicketPriority,
  STATUS_LABELS,
  PRIORITY_LABELS, PRIORITY_DOT,
  CATEGORY_ICONS, CATEGORY_LABELS, TYPE_SHORT,
  isOverdue, getAgeLabel, getDaysOld,
} from "@/types";
import AdminShell from "@/components/admin/AdminShell";

// ─── Configuration des vues ───────────────────────────────────────────────

const KANBAN_STATUSES: TicketStatus[] = ["nouveau", "en_cours", "transmis", "termine"];

const STATUS_ACCENT: Record<TicketStatus, { bar: string; dot: string; text: string }> = {
  nouveau:  { bar: "bg-blue-500",    dot: "bg-blue-500",    text: "text-blue-700" },
  en_cours: { bar: "bg-amber-500",   dot: "bg-amber-500",   text: "text-amber-700" },
  transmis: { bar: "bg-violet-500",  dot: "bg-violet-500",  text: "text-violet-700" },
  termine:  { bar: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700" },
  ferme:    { bar: "bg-slate-400",   dot: "bg-slate-400",   text: "text-slate-600" },
};

const NEXT_STATUS: Partial<Record<TicketStatus, TicketStatus>> = {
  nouveau:  "en_cours",
  en_cours: "transmis",
  transmis: "termine",
};

type SortKey = "recent" | "ancien" | "priorite" | "retard";

// ─── Composant interne ────────────────────────────────────────────────────

function TicketsListInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [, setAgents]           = useState<Agent[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Filtres
  const [statut,    setStatut]    = useState<TicketStatus | "">(
    (searchParams.get("statut") as TicketStatus) ?? ""
  );
  const [priorite,  setPriorite]  = useState<TicketPriority | "">(
    (searchParams.get("priorite") as TicketPriority) ?? ""
  );
  const [serviceId, setServiceId] = useState(searchParams.get("service") ?? "");
  const [retard,    setRetard]    = useState(searchParams.get("retard") === "1");
  const [search,    setSearch]    = useState("");
  const [sort,      setSort]      = useState<SortKey>("recent");
  const [showArchived, setShowArchived] = useState(false);

  // Vue (Liste / Kanban), persistée localement
  const [view, setView] = useState<"list" | "kanban">("list");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dm_tickets_view") : null;
    if (saved === "list" || saved === "kanban") setView(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("dm_tickets_view", view);
  }, [view]);

  // ── Chargement ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    if (DEMO_MODE) {
      let all = demoGetTickets(
        statut || undefined,
        serviceId || undefined,
        priorite || undefined,
        search || undefined,
        { onlyArchived: showArchived },
      );
      if (retard) all = all.filter((t) => isOverdue(t));
      setTickets(all);
    } else {
      const p = new URLSearchParams();
      if (statut)    p.set("statut", statut);
      if (serviceId) p.set("service", serviceId);
      const res = await fetch(`/api/tickets?${p}`);
      let data: Ticket[] = res.ok ? await res.json() : [];
      if (priorite) data = data.filter((t) => t.priorite === priorite);
      if (retard)   data = data.filter((t) => isOverdue(t));
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(
          (t) => t.adresse.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
        );
      }
      setTickets(data);
    }
    setLoading(false);
  }, [statut, serviceId, priorite, retard, search, showArchived]);

  useEffect(() => {
    if (!DEMO_MODE) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push("/admin");
      });
      fetch("/api/services").then((r) => r.json()).then(setServices);
    } else {
      setServices(demoGetServices());
      setAgents(demoGetAgents());
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // ── Stats globales (sur TOUS les tickets, pas juste filtrés) ──────────
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  useEffect(() => {
    if (DEMO_MODE) setAllTickets(demoGetTickets());
  }, [tickets]); // se recharge après chaque mutation

  const stats = useMemo(() => ({
    total:    allTickets.length,
    nouveau:  allTickets.filter((t) => t.statut === "nouveau").length,
    en_cours: allTickets.filter((t) => t.statut === "en_cours").length,
    urgents:  allTickets.filter((t) => t.priorite === "urgente" && t.statut !== "termine" && t.statut !== "ferme").length,
    retard:   allTickets.filter((t) => isOverdue(t)).length,
    termines: allTickets.filter((t) => t.statut === "termine").length,
  }), [allTickets]);

  // ── Tri ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...tickets];
    const prioRank: Record<TicketPriority, number> = { urgente: 0, haute: 1, normale: 2, faible: 3 };
    switch (sort) {
      case "recent":
        arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "ancien":
        arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "priorite":
        arr.sort((a, b) => prioRank[a.priorite] - prioRank[b.priorite]);
        break;
      case "retard":
        arr.sort((a, b) => {
          const oa = isOverdue(a) ? 1 : 0;
          const ob = isOverdue(b) ? 1 : 0;
          if (oa !== ob) return ob - oa;
          return getDaysOld(b.created_at) - getDaysOld(a.created_at);
        });
        break;
    }
    return arr;
  }, [tickets, sort]);

  // ── Actions inline ────────────────────────────────────────────────────
  function quickUpdate(id: string, patch: Parameters<typeof demoUpdateTicket>[1]) {
    if (DEMO_MODE) {
      const updated = demoUpdateTicket(id, patch);
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    }
  }

  function archiveTicket(id: string) {
    if (!DEMO_MODE) return;
    demoArchiveTicket(id);
    load();
  }
  function unarchiveTicket(id: string) {
    if (!DEMO_MODE) return;
    demoUnarchiveTicket(id);
    load();
  }
  function deleteTicket(id: string) {
    if (!DEMO_MODE) return;
    if (!window.confirm("Supprimer définitivement cette demande ? Cette action est irréversible.")) return;
    demoDeleteTicket(id);
    load();
  }

  // ── Filtres UI ────────────────────────────────────────────────────────
  const hasFilters = !!(statut || priorite || serviceId || retard || search);
  function clearFilters() {
    setStatut(""); setPriorite(""); setServiceId(""); setRetard(false); setSearch("");
  }

  // Filtre rapide depuis une stat chip
  function applyChip(kind: "all" | "nouveau" | "en_cours" | "urgents" | "retard" | "termines") {
    clearFilters();
    if (kind === "nouveau")  setStatut("nouveau");
    if (kind === "en_cours") setStatut("en_cours");
    if (kind === "termines") setStatut("termine");
    if (kind === "urgents")  setPriorite("urgente");
    if (kind === "retard")   setRetard(true);
  }

  const activeChip =
    !search && !serviceId
      ? retard ? "retard"
      : priorite === "urgente" && !statut ? "urgents"
      : statut === "nouveau" && !priorite ? "nouveau"
      : statut === "en_cours" && !priorite ? "en_cours"
      : statut === "termine" && !priorite ? "termines"
      : !statut && !priorite ? "all"
      : null
      : null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <AdminShell
      title="Gestion des demandes"
      subtitle={loading ? "Chargement…" : `${sorted.length} résultat${sorted.length > 1 ? "s" : ""} affiché${sorted.length > 1 ? "s" : ""}`}
    >
      <div className="p-6 flex flex-col gap-5">

        {/* ── Stats chips (cliquables = filtres rapides) ───────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <StatChip active={activeChip === "all"}      label="Toutes"     value={stats.total}    accent="slate"  onClick={() => applyChip("all")} />
          <StatChip active={activeChip === "nouveau"}  label="Nouvelles"  value={stats.nouveau}  accent="blue"   onClick={() => applyChip("nouveau")} />
          <StatChip active={activeChip === "en_cours"} label="En cours"   value={stats.en_cours} accent="amber"  onClick={() => applyChip("en_cours")} />
          <StatChip active={activeChip === "urgents"}  label="Urgentes"   value={stats.urgents}  accent="red"    onClick={() => applyChip("urgents")} />
          <StatChip active={activeChip === "retard"}   label="En retard"  value={stats.retard}   accent="orange" onClick={() => applyChip("retard")} />
          <StatChip active={activeChip === "termines"} label="Terminées"  value={stats.termines} accent="green"  onClick={() => applyChip("termines")} />
        </div>

        {/* ── Barre filtres + vue (une seule ligne) ────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher adresse, description, ID…"
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 focus:bg-white transition-colors"
            />
          </div>

          {/* Statut */}
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as TicketStatus | "")}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          >
            <option value="">Tous statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="en_cours">En cours</option>
            <option value="transmis">Transmis</option>
            <option value="termine">Terminé</option>
            <option value="ferme">Fermé</option>
          </select>

          {/* Priorité */}
          <select
            value={priorite}
            onChange={(e) => setPriorite(e.target.value as TicketPriority | "")}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          >
            <option value="">Toutes priorités</option>
            <option value="urgente">Urgente</option>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="faible">Faible</option>
          </select>

          {/* Service */}
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          >
            <option value="">Tous services</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>

          {/* Tri */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            title="Trier"
          >
            <option value="recent">↓ Plus récent</option>
            <option value="ancien">↑ Plus ancien</option>
            <option value="priorite">Priorité</option>
            <option value="retard">Retard</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2"
            >
              ✕ Effacer
            </button>
          )}

          <div className="flex-1" />

          {/* Toggle archives */}
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              showArchived
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
            title={showArchived ? "Voir les demandes actives" : "Voir les archives"}
          >
            🗄 {showArchived ? "Archives" : "Archives"}
          </button>

          {/* Toggle vue */}
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "list" ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="4"  width="14" height="2" rx="1" />
                <rect x="3" y="9"  width="14" height="2" rx="1" />
                <rect x="3" y="14" width="14" height="2" rx="1" />
              </svg>
              Liste
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "kanban" ? "bg-blue-900 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="3"  width="4" height="14" rx="1" />
                <rect x="8" y="3"  width="4" height="9"  rx="1" />
                <rect x="13" y="3" width="4" height="11" rx="1" />
              </svg>
              Kanban
            </button>
          </div>
        </div>

        {/* ── Contenu : Liste ou Kanban ────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center text-slate-400">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold text-sm">Aucune demande</div>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">Effacer les filtres</button>}
          </div>
        ) : view === "list" ? (
          <ListView
            tickets={sorted}
            onOpen={(id) => router.push(`/admin/tickets/${id}`)}
            onQuickUpdate={quickUpdate}
            onArchive={archiveTicket}
            onUnarchive={unarchiveTicket}
            onDelete={deleteTicket}
          />
        ) : (
          <KanbanView
            tickets={sorted}
            onOpen={(id) => router.push(`/admin/tickets/${id}`)}
            onQuickUpdate={quickUpdate}
            onArchive={archiveTicket}
            onUnarchive={unarchiveTicket}
            onDelete={deleteTicket}
          />
        )}
      </div>
    </AdminShell>
  );
}

// ─── Vue LISTE : cartes empilées avec action menu ─────────────────────────

interface RowActions {
  onOpen: (id: string) => void;
  onQuickUpdate: (id: string, patch: Parameters<typeof demoUpdateTicket>[1]) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function ListView({ tickets, ...actions }: { tickets: Ticket[] } & RowActions) {
  return (
    <div className="flex flex-col gap-2">
      {tickets.map((t) => (
        <TicketRow key={t.id} ticket={t} {...actions} />
      ))}
    </div>
  );
}

function TicketRow({ ticket: t, onOpen, onQuickUpdate, onArchive, onUnarchive, onDelete }: {
  ticket: Ticket;
} & RowActions) {
  const svc   = t.service as Service | undefined;
  const agent = t.agent   as Agent   | undefined;
  const late  = isOverdue(t);
  const days  = getDaysOld(t.created_at);
  const accent = STATUS_ACCENT[t.statut];

  return (
    <div
      className={`relative bg-white rounded-xl border transition-all cursor-pointer group hover:shadow-md hover:border-blue-200 ${
        late ? "border-red-200" : "border-slate-200"
      }`}
      onClick={() => onOpen(t.id)}
    >
      {/* Barre d'accent gauche selon statut */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${accent.bar}`} />

      <div className="flex items-center gap-4 pl-5 pr-3 py-3">
        {/* Icône catégorie */}
        <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-blue-50">
          {CATEGORY_ICONS[t.categorie]}
        </div>

        {/* Bloc info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-slate-900 text-sm truncate">
              {CATEGORY_LABELS[t.categorie]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold ${accent.text} bg-slate-50`}>
              {STATUS_LABELS[t.statut]}
            </span>
            {t.priorite === "urgente" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold bg-red-100 text-red-700">
                Urgente
              </span>
            )}
            {late && (
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold bg-orange-100 text-orange-700">
                ⏰ +{days}j
              </span>
            )}
            {(t.duplicate_count ?? 1) > 1 && (
              <span
                title={`${t.duplicate_count} signalements similaires regroupés par IA`}
                className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold bg-indigo-100 text-indigo-700 inline-flex items-center gap-0.5"
              >
                🔗 ×{t.duplicate_count}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate">
            📍 {t.adresse}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{TYPE_SHORT[t.type]}</span>
            <span>·</span>
            <span>{getAgeLabel(t.created_at)}</span>
            {svc && (<><span>·</span><span>{svc.nom}</span></>)}
            {agent && (<><span>·</span><span>👤 {agent.nom}</span></>)}
          </div>
        </div>

        {/* Priorité (dot) sur desktop */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priorite]}`} />
          <span className="text-xs text-slate-500 font-medium">{PRIORITY_LABELS[t.priorite]}</span>
        </div>

        {/* Bouton action rapide (next status) */}
        {NEXT_STATUS[t.statut] && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickUpdate(t.id, { statut: NEXT_STATUS[t.statut] });
            }}
            title={`Marquer ${STATUS_LABELS[NEXT_STATUS[t.statut]!].toLowerCase()}`}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors flex-shrink-0"
          >
            → {STATUS_LABELS[NEXT_STATUS[t.statut]!]}
          </button>
        )}

        {/* Menu kebab */}
        <ActionMenu ticket={t} onQuickUpdate={onQuickUpdate} onArchive={onArchive} onUnarchive={onUnarchive} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ─── Vue KANBAN : colonnes par statut ─────────────────────────────────────

function KanbanView({ tickets, ...actions }: { tickets: Ticket[] } & RowActions) {
  const { onOpen, onQuickUpdate, onArchive, onUnarchive, onDelete } = actions;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {KANBAN_STATUSES.map((status) => {
        const items = tickets.filter((t) => t.statut === status);
        const accent = STATUS_ACCENT[status];
        return (
          <div key={status} className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col min-h-[200px]">
            {/* Header colonne */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {items.length}
              </span>
            </div>

            {/* Cartes */}
            <div className="p-2 flex flex-col gap-2 flex-1">
              {items.length === 0 ? (
                <div className="text-center text-slate-300 text-xs py-8">Aucune demande</div>
              ) : (
                items.map((t) => (
                  <KanbanCard
                    key={t.id} ticket={t}
                    onOpen={onOpen} onQuickUpdate={onQuickUpdate}
                    onArchive={onArchive} onUnarchive={onUnarchive} onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ ticket: t, onOpen, onQuickUpdate, onArchive, onUnarchive, onDelete }: {
  ticket: Ticket;
} & RowActions) {
  const late  = isOverdue(t);
  const days  = getDaysOld(t.created_at);
  const svc   = t.service as Service | undefined;

  return (
    <div
      onClick={() => onOpen(t.id)}
      className={`bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
        late ? "border-red-200" : "border-slate-200 hover:border-blue-200"
      }`}
    >
      {/* Haut : icône + badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{CATEGORY_ICONS[t.categorie]}</span>
          <span className="text-[11px] font-semibold text-slate-700">
            {CATEGORY_LABELS[t.categorie]}
          </span>
        </div>
        <ActionMenu ticket={t} onQuickUpdate={onQuickUpdate} onArchive={onArchive} onUnarchive={onUnarchive} onDelete={onDelete} small />
      </div>

      {/* Adresse */}
      <div className="text-xs text-slate-600 line-clamp-2 leading-snug mb-2">
        📍 {t.adresse}
      </div>

      {/* Badges bas */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priorite]}`} />
          {PRIORITY_LABELS[t.priorite]}
        </span>
        {t.priorite === "urgente" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700">
            URGENTE
          </span>
        )}
        {late && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700">
            ⏰ +{days}j
          </span>
        )}
        {(t.duplicate_count ?? 1) > 1 && (
          <span
            title={`${t.duplicate_count} signalements regroupés`}
            className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700"
          >
            🔗 ×{t.duplicate_count}
          </span>
        )}
      </div>

      {/* Footer : service + âge */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
        <span className="truncate">{svc?.nom ?? "—"}</span>
        <span className="flex-shrink-0 ml-2">{getAgeLabel(t.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Menu d'action rapide (kebab) ─────────────────────────────────────────

function ActionMenu({ ticket: t, onQuickUpdate, onArchive, onUnarchive, onDelete, small }: {
  ticket: Ticket;
  onQuickUpdate: (id: string, patch: Parameters<typeof demoUpdateTicket>[1]) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const statuses: TicketStatus[] = ["nouveau", "en_cours", "transmis", "termine", "ferme"];
  const priorities: TicketPriority[] = ["urgente", "haute", "normale", "faible"];

  return (
    <div className="relative flex-shrink-0" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
          small ? "w-6 h-6" : "w-8 h-8"
        }`}
        aria-label="Actions"
      >
        <svg className={small ? "w-4 h-4" : "w-4 h-4"} fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4"  r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Changer le statut
          </div>
          {statuses.map((s) => (
            <button
              key={s}
              disabled={s === t.statut}
              onClick={() => { onQuickUpdate(t.id, { statut: s }); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                s === t.statut
                  ? "text-slate-300 cursor-default"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_ACCENT[s].dot}`} />
              {STATUS_LABELS[s]}
              {s === t.statut && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          ))}
          <div className="border-t border-slate-100 my-1" />
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Priorité
          </div>
          {priorities.map((p) => (
            <button
              key={p}
              disabled={p === t.priorite}
              onClick={() => { onQuickUpdate(t.id, { priorite: p }); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                p === t.priorite
                  ? "text-slate-300 cursor-default"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
              {PRIORITY_LABELS[p]}
              {p === t.priorite && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          ))}

          <div className="border-t border-slate-100 my-1" />
          {!t.archived ? (
            <button
              onClick={() => { onArchive(t.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700"
            >
              🗄 Archiver
            </button>
          ) : (
            <button
              onClick={() => { onUnarchive(t.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-fresnes-50 hover:text-fresnes-700"
            >
              ↺ Désarchiver
            </button>
          )}
          <button
            onClick={() => { onDelete(t.id); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            🗑 Supprimer définitivement
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stat chip cliquable ──────────────────────────────────────────────────

function StatChip({ label, value, accent, active, onClick }: {
  label: string;
  value: number;
  accent: "slate" | "blue" | "amber" | "red" | "orange" | "green";
  active: boolean;
  onClick: () => void;
}) {
  const styles: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    slate:  { bg: "bg-slate-50",    text: "text-slate-700",   border: "border-slate-200",   ring: "ring-slate-400" },
    blue:   { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-100",    ring: "ring-blue-500" },
    amber:  { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-100",   ring: "ring-amber-500" },
    red:    { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-100",     ring: "ring-red-500" },
    orange: { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-100",  ring: "ring-orange-500" },
    green:  { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-100", ring: "ring-emerald-500" },
  };
  const s = styles[accent];
  return (
    <button
      onClick={onClick}
      className={`${s.bg} ${s.border} border rounded-xl px-3 py-2.5 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ${
        active ? `ring-2 ${s.ring} shadow-sm` : ""
      }`}
    >
      <div className={`text-[10px] font-bold uppercase tracking-wider ${s.text} opacity-70`}>{label}</div>
      <div className={`text-2xl font-bold ${s.text} leading-tight mt-0.5`}>{value}</div>
    </button>
  );
}

// ─── Default export avec Suspense ─────────────────────────────────────────

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsListInner />
    </Suspense>
  );
}
