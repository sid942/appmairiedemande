"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEMO_MODE, demoGetTicket, demoGetServices, demoGetAgents,
  demoUpdateTicket, demoGetNotes, demoAddNote, demoDispatchTicket,
  demoArchiveTicket, demoUnarchiveTicket, demoDeleteTicket,
  demoGetDuplicates,
} from "@/lib/demo-store";
import {
  Ticket, Service, Agent, TicketNote,
  TicketStatus, TicketPriority,
  STATUS_LABELS,
  PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_DOT,
  CATEGORY_ICONS, CATEGORY_LABELS, TYPE_LABELS,
  isOverdue, getAgeLabel, getDaysOld,
} from "@/types";
import AdminShell from "@/components/admin/AdminShell";

// ─── Config ──────────────────────────────────────────────────────────────

const PIPELINE: TicketStatus[] = ["nouveau", "en_cours", "transmis", "termine"];

const STATUS_ACCENT: Record<TicketStatus, { fill: string; text: string; bg: string }> = {
  nouveau:  { fill: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50" },
  en_cours: { fill: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50" },
  transmis: { fill: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50" },
  termine:  { fill: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  ferme:    { fill: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-50" },
};

const NEXT_ACTION: Partial<Record<TicketStatus, { label: string; next: TicketStatus; icon: string }>> = {
  nouveau:  { label: "Prendre en charge", next: "en_cours", icon: "▶" },
  transmis: { label: "Marquer terminé",   next: "termine",  icon: "✓" },
};

const PRIORITIES: TicketPriority[] = ["urgente", "haute", "normale", "faible"];

const NOTE_ICONS: Record<TicketNote["type"], string> = {
  created:              "📥",
  status_changed:       "🔄",
  service_changed:      "🏢",
  priority_changed:     "🎯",
  agent_changed:        "👤",
  citoyen_contacte:     "📞",
  transmis_prestataire: "🚚",
  note:                 "💬",
  rated:                "⭐",
  dispatched:           "📧",
  service_update:       "✏️",
  archived:             "🗄",
  unarchived:           "↺",
  duplicate_linked:     "🔗",
};

// ─── Page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id     = params.id;
  const router = useRouter();

  const [ticket,   setTicket]   = useState<Ticket | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [agents,   setAgents]   = useState<Agent[]>([]);
  const [notes,    setNotes]    = useState<TicketNote[]>([]);
  const [duplicates, setDuplicates] = useState<Ticket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");

  // Dispatch
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchSending, setDispatchSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ ok: boolean; emails: string[]; error?: string } | null>(null);

  // Sections repliables
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [openHistory,  setOpenHistory]  = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setTicket(demoGetTicket(id));
      setServices(demoGetServices());
      setAgents(demoGetAgents());
      setNotes(demoGetNotes(id));
      setDuplicates(demoGetDuplicates(id));
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/admin");
    });
    Promise.all([
      fetch(`/api/tickets/${id}`).then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTicket(t); setServices(s); setLoading(false);
    });
  }, [id, router]);

  const filteredAgents = useMemo(
    () => (ticket?.service_id ? agents.filter((a) => a.service_id === ticket.service_id) : agents),
    [agents, ticket?.service_id],
  );

  async function update(patch: Parameters<typeof demoUpdateTicket>[1]) {
    if (!ticket) return;
    const key = Object.keys(patch)[0];
    setSaving(key);
    if (DEMO_MODE) {
      const updated = demoUpdateTicket(id, patch);
      if (updated) { setTicket(updated); setNotes(demoGetNotes(id)); }
    } else {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) setTicket(await res.json());
    }
    setSaving(null);
  }

  async function submitNote() {
    if (!noteText.trim()) return;
    setSaving("note");
    if (DEMO_MODE) {
      demoAddNote(id, noteText.trim());
      setNotes(demoGetNotes(id));
    }
    setNoteText("");
    setSaving(null);
  }

  async function handleDispatch(emails: string[], message?: string) {
    if (!ticket || dispatchSending) return;
    setDispatchSending(true);
    setDispatchResult(null);
    if (DEMO_MODE) {
      const r = await demoDispatchTicket(id, emails, message);
      setTicket(r.ticket);
      setNotes(demoGetNotes(id));
      setDispatchResult({ ok: r.ok, emails: r.emails, error: r.error });
    }
    setDispatchSending(false);
  }

  function handleArchive() {
    if (!ticket) return;
    const updated = ticket.archived ? demoUnarchiveTicket(id) : demoArchiveTicket(id);
    if (updated) { setTicket(updated); setNotes(demoGetNotes(id)); }
  }

  function handleDelete() {
    if (!ticket) return;
    if (!window.confirm("Supprimer définitivement cette demande ? Cette action est irréversible.")) return;
    const ok = demoDeleteTicket(id);
    if (ok) router.push("/admin/tickets");
  }

  // ── Loading / not found ───────────────────────────────────────────────
  if (loading) return (
    <AdminShell title="Chargement…">
      <div className="flex items-center justify-center h-64 text-slate-400">Chargement…</div>
    </AdminShell>
  );

  if (!ticket) return (
    <AdminShell title="Demande introuvable">
      <div className="p-6 text-slate-400">Cette demande n&apos;existe pas.</div>
    </AdminShell>
  );

  const svc     = ticket.service as Service | undefined;
  const agent   = ticket.agent  as Agent   | undefined;
  const late    = isOverdue(ticket);
  const days    = getDaysOld(ticket.created_at);
  const accent  = STATUS_ACCENT[ticket.statut];
  const cta     = NEXT_ACTION[ticket.statut];
  const isDone  = ticket.statut === "termine" || ticket.statut === "ferme";

  return (
    <AdminShell
      title={CATEGORY_LABELS[ticket.categorie]}
      subtitle={`#${ticket.id.slice(0,8).toUpperCase()} · ${getAgeLabel(ticket.created_at)} · ${TYPE_LABELS[ticket.type]}`}
    >
      <div className="p-6 max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/admin/tickets")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            ← Retour
          </button>

          {ticket.archived && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
              🗄 Archivée
            </span>
          )}

          <div className="flex-1" />

          {late && !isDone && (
            <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
              ⏰ Retard {days}j
            </span>
          )}

          {/* Imprimer */}
          <button
            onClick={() => window.open(`/admin/tickets/${id}/print`, "_blank")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 text-sm font-semibold px-3 py-2 rounded-lg"
            title="Imprimer / Exporter PDF"
          >
            🖨️
          </button>

          {!isDone && (
            <button
              onClick={() => { setDispatchResult(null); setDispatchOpen(true); }}
              disabled={saving !== null}
              className="flex items-center gap-2 bg-fresnes-500 hover:bg-fresnes-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
            >
              📧 {ticket.dispatched_at ? "Renvoyer par e-mail" : "Transférer par e-mail"}
            </button>
          )}

          {cta && !isDone && (
            <button
              onClick={() => update({ statut: cta.next })}
              disabled={saving !== null}
              className="flex items-center gap-2 bg-fresnes-700 hover:bg-fresnes-800 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-md disabled:opacity-60"
            >
              <span>{cta.icon}</span> {cta.label}
            </button>
          )}

          {isDone && (
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
              ✓ {ticket.statut === "ferme" ? "Fermée" : "Terminée"}
            </span>
          )}
        </div>

        {/* ── Bandeau dispatch ─────────────────────────────────────── */}
        {ticket.dispatched_at && (
          <div className="bg-gradient-to-br from-fresnes-500 to-fresnes-700 text-white rounded-2xl p-4 shadow-md shadow-fresnes-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📧</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">Transmise au {svc?.nom ?? "service"} par e-mail</div>
                <div className="text-xs text-fresnes-100 mt-0.5">
                  {new Date(ticket.dispatched_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" "}· <strong>{ticket.dispatched_to?.join(", ")}</strong>
                </div>
                {ticket.dispatch_message && (
                  <div className="mt-2 text-xs bg-white/10 rounded-lg p-2.5 italic">« {ticket.dispatch_message} »</div>
                )}
              </div>
            </div>
          </div>
        )}

        {dispatchResult && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2.5 ${
            dispatchResult.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            <span className="text-base">{dispatchResult.ok ? "✓" : "⚠"}</span>
            <div className="flex-1">
              {dispatchResult.ok
                ? <><strong>E-mail envoyé</strong> à {dispatchResult.emails.join(", ")}.</>
                : <><strong>Échec de l&apos;envoi.</strong> {dispatchResult.error ?? "Vérifiez la configuration."} Le ticket a été marqué transmis.</>}
            </div>
            <button onClick={() => setDispatchResult(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}

        {/* ── HERO : Description ───────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${
          ticket.priorite === "urgente" ? "border-red-200" : "border-slate-200"
        }`}>
          {/* En-tête contextuel */}
          <div className={`${accent.bg} px-6 py-4 border-b border-slate-100 flex items-start gap-4`}>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
              {CATEGORY_ICONS[ticket.categorie]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">{CATEGORY_LABELS[ticket.categorie]}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${accent.text} bg-white border border-current/20`}>
                  {STATUS_LABELS[ticket.statut]}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${PRIORITY_COLORS[ticket.priorite]}`}>
                  {PRIORITY_LABELS[ticket.priorite]}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>📍 {ticket.adresse}</span>
                <span className="text-slate-300">·</span>
                <span>📅 {new Date(ticket.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>

          {/* Description bien lisible */}
          <div className="px-6 py-5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Demande du citoyen
            </div>
            <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Photo en bas du hero, si présente */}
          {ticket.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ticket.photo_url} alt="Photo jointe" className="w-full max-h-80 object-cover border-t border-slate-100" />
          )}

          {/* Contact citoyen — barre simple */}
          <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0 border border-slate-200">
                {(ticket.nom ?? ticket.contact)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                {ticket.nom && <div className="text-sm font-semibold text-slate-800 truncate">{ticket.nom}</div>}
                <div className="text-xs text-slate-500 truncate">{ticket.contact}</div>
              </div>
            </div>
            <a
              href={ticket.contact.includes("@") ? `mailto:${ticket.contact}` : `tel:${ticket.contact}`}
              className="text-xs font-semibold text-fresnes-700 border border-fresnes-200 hover:bg-fresnes-50 px-3 py-1.5 rounded-lg flex-shrink-0"
            >
              {ticket.contact.includes("@") ? "✉ Écrire" : "📞 Appeler"}
            </a>
          </div>
        </div>

        {/* ── Bandeau "ticket-doublon" si applicable ─────────────────── */}
        {ticket.duplicate_of && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-indigo-200">🔗</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-indigo-900">
                Re-signalement rattaché par l&apos;IA
              </div>
              <div className="text-xs text-indigo-700/80 mt-0.5">
                Ce ticket a été identifié comme un signalement supplémentaire d&apos;une demande existante
                {typeof ticket.duplicate_confidence === "number" && (
                  <> (confiance {Math.round(ticket.duplicate_confidence * 100)}%)</>
                )}
                .
              </div>
              <button
                onClick={() => router.push(`/admin/tickets/${ticket.duplicate_of}`)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg"
              >
                Voir la demande maître →
              </button>
            </div>
          </div>
        )}

        {/* ── Liste des signalements rattachés ───────────────────────── */}
        {duplicates.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-indigo-200 overflow-hidden">
            <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-indigo-900">
                  {(ticket.duplicate_count ?? duplicates.length + 1)} signalements regroupés par l&apos;IA
                </div>
                <div className="text-[11px] text-indigo-700/70">
                  Le citoyen original + {duplicates.length} re-signalement{duplicates.length > 1 ? "s" : ""} pour la même demande.
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {duplicates.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => router.push(`/admin/tickets/${d.id}`)}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-700 flex-shrink-0">
                    {i + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 line-clamp-2">{d.description}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>📍 {d.adresse}</span>
                      <span>·</span>
                      <span>{d.nom ?? d.contact}</span>
                      <span>·</span>
                      <span>{getAgeLabel(d.created_at)}</span>
                      {typeof d.duplicate_confidence === "number" && (
                        <>
                          <span>·</span>
                          <span className="text-indigo-600 font-semibold">
                            IA {Math.round(d.duplicate_confidence * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-300 text-xs">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Stepper compact ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <StatusStepper current={ticket.statut} onJump={(s) => update({ statut: s })} disabled={saving !== null} />
        </div>

        {/* ── Assignation rapide (priorité + service + agent) ──────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Service
              </label>
              <select
                value={ticket.service_id ?? ""}
                onChange={(e) => update({ service_id: e.target.value })}
                disabled={saving !== null}
                className="w-full text-sm py-2 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              >
                <option value="">— Non assigné —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Agent
              </label>
              <select
                value={ticket.agent_id ?? ""}
                onChange={(e) => update({ agent_id: e.target.value })}
                disabled={saving !== null || filteredAgents.length === 0}
                className="w-full text-sm py-2 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">— Non assigné —</option>
                {filteredAgents.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Priorité
              </label>
              <select
                value={ticket.priorite}
                onChange={(e) => update({ priorite: e.target.value as TicketPriority })}
                disabled={saving !== null}
                className="w-full text-sm py-2 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          {agent && (
            <p className="text-xs text-slate-400 mt-3">
              Agent en charge : <strong className="text-slate-600">{agent.nom}</strong>
            </p>
          )}
        </div>

        {/* ── Historique (collapsible) ─────────────────────────────── */}
        <CollapseSection
          title="Historique"
          subtitle={`${notes.length} événement${notes.length !== 1 ? "s" : ""}`}
          open={openHistory}
          onToggle={() => setOpenHistory((v) => !v)}
        >
          {notes.length === 0 ? (
            <p className="text-xs text-slate-400">Aucun événement.</p>
          ) : (
            <div className="flex flex-col">
              {notes.map((n, i) => (
                <div key={n.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-sm flex-shrink-0 border border-slate-100">
                      {NOTE_ICONS[n.type]}
                    </div>
                    {i < notes.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 leading-snug">{n.contenu}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {n.author && <span className="font-semibold text-slate-500">{n.author} · </span>}
                      {new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ajouter une note interne…"
              rows={2}
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40 focus:bg-white resize-none"
            />
            {noteText.trim() && (
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setNoteText("")} className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5">Annuler</button>
                <button
                  onClick={submitNote}
                  disabled={saving === "note"}
                  className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {saving === "note" ? "Enregistrement…" : "Ajouter la note"}
                </button>
              </div>
            )}
          </div>
        </CollapseSection>

        {/* ── Actions avancées (collapsible) ───────────────────────── */}
        <CollapseSection
          title="Actions avancées"
          subtitle="Suivi citoyen, transmission prestataire, fermeture"
          open={openAdvanced}
          onToggle={() => setOpenAdvanced((v) => !v)}
        >
          <div className="grid sm:grid-cols-2 gap-2.5">
            <ToggleRow
              done={!!ticket.citoyen_contacte}
              label="Citoyen contacté"
              icon="📞"
              disabled={saving !== null}
              onClick={() => update({ citoyen_contacte: !ticket.citoyen_contacte })}
            />
            <ToggleRow
              done={!!ticket.transmis_prestataire}
              label="Transmis prestataire"
              icon="🚚"
              disabled={saving !== null}
              onClick={() => update({ transmis_prestataire: !ticket.transmis_prestataire })}
            />
            {!isDone && (
              <button
                onClick={() => update({ statut: "ferme" })}
                disabled={saving !== null}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2.5"
              >
                Fermer la demande sans action
              </button>
            )}
            {ticket.statut === "ferme" && (
              <button
                onClick={() => update({ statut: "nouveau" })}
                disabled={saving !== null}
                className="text-xs font-semibold text-fresnes-700 hover:text-fresnes-800 bg-white border border-fresnes-200 hover:bg-fresnes-50 rounded-lg px-3 py-2.5"
              >
                ↺ Rouvrir
              </button>
            )}
          </div>
        </CollapseSection>

        {/* ── Zone dangereuse ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100 bg-red-50/50">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest">Zone dangereuse</h3>
          </div>
          <div className="p-4 grid sm:grid-cols-2 gap-3">
            <button
              onClick={handleArchive}
              className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-800">
                  {ticket.archived ? "↺ Désarchiver" : "🗄 Archiver"}
                </div>
                <div className="text-[11px] text-amber-700/70 mt-0.5">
                  {ticket.archived ? "Réintégrer aux demandes actives" : "Conserver l'historique mais sortir des vues"}
                </div>
              </div>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-left"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-red-700">🗑 Supprimer définitivement</div>
                <div className="text-[11px] text-red-600/70 mt-0.5">
                  Action irréversible — supprime aussi l&apos;historique
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal dispatch */}
      {dispatchOpen && (
        <DispatchModal
          serviceName={svc?.nom ?? "service"}
          serviceEmail={svc?.email ?? ""}
          ccEmails={svc?.cc_emails ?? []}
          sending={dispatchSending}
          onClose={() => setDispatchOpen(false)}
          onConfirm={async (emails, msg) => {
            await handleDispatch(emails, msg);
            setDispatchOpen(false);
          }}
        />
      )}
    </AdminShell>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function StatusStepper({ current, onJump, disabled }: {
  current: TicketStatus;
  onJump: (s: TicketStatus) => void;
  disabled: boolean;
}) {
  if (current === "ferme") {
    return (
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold">✕</div>
        <div>
          <div className="text-sm font-semibold text-slate-700">Demande fermée</div>
          <div className="text-[11px] text-slate-400">Cette demande a été fermée sans traitement</div>
        </div>
      </div>
    );
  }

  const currentIdx = PIPELINE.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {PIPELINE.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const accent = STATUS_ACCENT[s];
        const canJump = !disabled && i !== currentIdx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              disabled={!canJump}
              onClick={() => onJump(s)}
              className={`flex flex-col items-center gap-1.5 ${canJump ? "cursor-pointer" : "cursor-default"}`}
              title={canJump ? `Marquer "${STATUS_LABELS[s]}"` : STATUS_LABELS[s]}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                active ? `${accent.fill} text-white ring-4 ring-fresnes-100 shadow-md`
                : done ? `${accent.fill} text-white`
                : "bg-white border-2 border-slate-200 text-slate-400"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
                active ? accent.text : done ? "text-slate-600" : "text-slate-400"
              }`}>
                {STATUS_LABELS[s]}
              </span>
            </button>
            {i < PIPELINE.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-4 min-w-[20px]">
                <div className={`h-full rounded-full ${i < currentIdx ? accent.fill : "bg-slate-200"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollapseSection({ title, subtitle, open, onToggle, children }: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <div className="text-sm font-bold text-slate-800">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function ToggleRow({ done, label, icon, disabled, onClick }: {
  done: boolean;
  label: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
        done
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      } disabled:opacity-70`}
    >
      <span className="text-sm">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
        done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
      }`}>
        {done && "✓"}
      </span>
    </button>
  );
}

// ─── Modal dispatch ──────────────────────────────────────────────────────

function DispatchModal({
  serviceName, serviceEmail, ccEmails,
  sending, onClose, onConfirm,
}: {
  serviceName: string;
  serviceEmail: string;
  ccEmails: string[];
  sending: boolean;
  onClose: () => void;
  onConfirm: (emails: string[], message?: string) => void;
}) {
  const seed = [serviceEmail, ...ccEmails].filter(Boolean);
  const [emails, setEmails] = useState<string[]>(seed);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  function addEmail() {
    const e = draft.trim();
    if (!e || emails.includes(e)) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    setEmails([...emails, e]);
    setDraft("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-br from-fresnes-500 to-fresnes-700 text-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">📧</div>
            <div className="flex-1">
              <div className="text-base font-bold">Dispatcher au {serviceName}</div>
              <div className="text-xs text-fresnes-100 mt-0.5">
                Une copie complète de la demande sera envoyée par e-mail.
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Destinataires
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {emails.map((e) => (
                <span key={e} className="inline-flex items-center gap-1.5 bg-fresnes-50 border border-fresnes-200 text-fresnes-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                  {e}
                  <button onClick={() => removeEmail(e)} className="text-fresnes-500 hover:text-fresnes-800">✕</button>
                </span>
              ))}
              {emails.length === 0 && <span className="text-xs text-slate-400 italic">Aucun destinataire…</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                placeholder="email@service.fr"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
              <button
                onClick={addEmail}
                disabled={!draft.trim()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-semibold rounded-lg"
              >
                + Ajouter
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Message (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex : Merci de prioriser cette demande, le citoyen a déjà relancé."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40 resize-none"
            />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
            ✉️ L&apos;e-mail contiendra la catégorie, l&apos;adresse, la description complète,
            les coordonnées du citoyen et un lien direct vers le portail service.
            Le statut passera automatiquement à <strong>« Transmis »</strong>.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(emails, message)}
            disabled={sending || emails.length === 0}
            className="bg-fresnes-500 hover:bg-fresnes-600 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-md flex items-center gap-2"
          >
            {sending ? "Envoi en cours…" : <>📧 Envoyer ({emails.length})</>}
          </button>
        </div>
      </div>
    </div>
  );
}
