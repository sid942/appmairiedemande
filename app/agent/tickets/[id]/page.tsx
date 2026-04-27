"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DEMO_MODE,
  demoGetTicket, demoGetNotes, demoGetAgentSession,
  demoServiceUpdateTicket, demoAddNote,
} from "@/lib/demo-store";
import {
  Ticket, TicketNote, TicketStatus,
  STATUS_LABELS, STATUS_COLORS,
  CATEGORY_LABELS, CATEGORY_ICONS, TYPE_LABELS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  getAgeLabel, getDaysOld, isOverdue,
} from "@/types";
import AgentShell from "@/components/agent/AgentShell";

const PIPELINE: TicketStatus[] = ["nouveau", "en_cours", "transmis", "termine"];

const STATUS_ACCENT: Record<TicketStatus, { fill: string; text: string; bg: string }> = {
  nouveau:  { fill: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50" },
  en_cours: { fill: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50" },
  transmis: { fill: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50" },
  termine:  { fill: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  ferme:    { fill: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-50" },
};

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

const NEXT_STATUS: Partial<Record<TicketStatus, { label: string; next: TicketStatus; color: string }>> = {
  nouveau:  { label: "Prendre en charge",  next: "en_cours", color: "bg-amber-600 hover:bg-amber-700" },
  en_cours: { label: "Marquer transmis",   next: "transmis", color: "bg-violet-600 hover:bg-violet-700" },
  transmis: { label: "Marquer terminé",    next: "termine",  color: "bg-emerald-600 hover:bg-emerald-700" },
};

export default function AgentTicketDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [ticket,       setTicket]       = useState<Ticket | null>(null);
  const [notes,        setNotes]        = useState<TicketNote[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [noteText,     setNoteText]     = useState("");
  const [agentName,    setAgentName]    = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!DEMO_MODE) return;
    const session = demoGetAgentSession();
    if (!session) return;
    setAgentName(session.agent_nom);
    const t = demoGetTicket(id);
    if (!t) { setLoading(false); return; }
    // Vérification : ce ticket doit être assigné à cet agent
    if (t.agent_id !== session.agent_id) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setTicket(t);
    setNotes(demoGetNotes(id));
    setLoading(false);
  }, [id]);

  function handleStatusChange(newStatus: TicketStatus) {
    if (!ticket) return;
    setSaving(true);
    if (DEMO_MODE) {
      const updated = demoServiceUpdateTicket(id, { statut: newStatus }, agentName);
      if (updated) {
        setTicket(updated);
        setNotes(demoGetNotes(id));
      }
    }
    setSaving(false);
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    if (DEMO_MODE) {
      demoAddNote(id, noteText.trim());
      setNotes(demoGetNotes(id));
    }
    setNoteText("");
    setSaving(false);
  }

  // ── Loading / states ────────────────────────────────────────────────────

  if (loading) return (
    <AgentShell title="Chargement…">
      <div className="flex items-center justify-center h-64 text-slate-400">Chargement…</div>
    </AgentShell>
  );

  if (unauthorized) return (
    <AgentShell title="Accès refusé">
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-slate-700 font-semibold">Cette demande ne vous est pas assignée.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-600 hover:underline">
          ← Retour
        </button>
      </div>
    </AgentShell>
  );

  if (!ticket) return (
    <AgentShell title="Introuvable">
      <div className="p-6 text-slate-400">Demande introuvable.</div>
    </AgentShell>
  );

  const accent  = STATUS_ACCENT[ticket.statut];
  const cta     = NEXT_STATUS[ticket.statut];
  const late    = isOverdue(ticket);
  const days    = getDaysOld(ticket.created_at);
  const isDone  = ticket.statut === "termine" || ticket.statut === "ferme";

  return (
    <AgentShell
      title={CATEGORY_LABELS[ticket.categorie]}
      subtitle={`#${ticket.id.slice(0, 8).toUpperCase()} · ${getAgeLabel(ticket.created_at)} · ${TYPE_LABELS[ticket.type]}`}
    >
      <div className="space-y-4">

        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/agent/dashboard")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            ← Mes tâches
          </button>
          <div className="flex-1" />
          {late && !isDone && (
            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              ⏰ Retard {days}j
            </span>
          )}
          {!isDone && cta && (
            <button
              onClick={() => handleStatusChange(cta.next)}
              disabled={saving}
              className={`flex items-center gap-2 ${cta.color} text-white text-sm font-bold px-5 py-2 rounded-lg shadow-md disabled:opacity-60 transition-colors`}
            >
              {saving ? "Mise à jour…" : `✓ ${cta.label}`}
            </button>
          )}
          {isDone && (
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
              ✅ {ticket.statut === "ferme" ? "Fermée" : "Terminée"}
            </span>
          )}
        </div>

        {/* ── Hero demande ─────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${
          ticket.priorite === "urgente" ? "border-red-200" : "border-slate-200"
        }`}>
          {/* Entête coloré */}
          <div className={`${accent.bg} px-6 py-4 border-b border-slate-100 flex items-start gap-4`}>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
              {CATEGORY_ICONS[ticket.categorie]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">{CATEGORY_LABELS[ticket.categorie]}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${STATUS_COLORS[ticket.statut]}`}>
                  {STATUS_LABELS[ticket.statut]}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${PRIORITY_COLORS[ticket.priorite]}`}>
                  {PRIORITY_LABELS[ticket.priorite]}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                📍 {ticket.adresse} · 📅 {new Date(ticket.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 py-5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Demande du citoyen</div>
            <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Photo */}
          {ticket.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ticket.photo_url} alt="Photo jointe" className="w-full max-h-72 object-cover border-t border-slate-100" />
          )}

          {/* Contact citoyen */}
          <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200 flex-shrink-0">
                {(ticket.nom ?? ticket.contact)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                {ticket.nom && <div className="text-sm font-semibold text-slate-800 truncate">{ticket.nom}</div>}
                <div className="text-xs text-slate-500 truncate">{ticket.contact}</div>
              </div>
            </div>
            <a
              href={ticket.contact.includes("@") ? `mailto:${ticket.contact}` : `tel:${ticket.contact}`}
              className="text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex-shrink-0"
            >
              {ticket.contact.includes("@") ? "✉ Écrire" : "📞 Appeler"}
            </a>
          </div>
        </div>

        {/* ── Pipeline statut ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Avancement</div>
          <AgentStepper current={ticket.statut} onJump={handleStatusChange} disabled={saving} />
        </div>

        {/* ── Actions rapides ───────────────────────────────────────── */}
        {!isDone && (
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href={ticket.contact.includes("@") ? `mailto:${ticket.contact}` : `tel:${ticket.contact}`}
              className="flex items-center gap-3 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl px-4 py-3 transition-all"
            >
              <span className="text-2xl">{ticket.contact.includes("@") ? "✉️" : "📞"}</span>
              <div>
                <div className="text-sm font-bold text-slate-800">Contacter le citoyen</div>
                <div className="text-xs text-slate-400">{ticket.contact}</div>
              </div>
            </a>
            {ticket.dispatched_at && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <span className="text-2xl">📧</span>
                <div>
                  <div className="text-sm font-bold text-indigo-800">Reçu par e-mail</div>
                  <div className="text-xs text-indigo-600">
                    {new Date(ticket.dispatched_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Historique + Note ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-800">Historique</div>
            <span className="text-[11px] text-slate-400">{notes.length} événement{notes.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="px-5 py-4">
            {/* Zone de note */}
            <div className="mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ajouter une note de suivi (intervention réalisée, contact citoyen, problème rencontré…)"
                rows={3}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 focus:bg-white resize-none placeholder:text-slate-300"
              />
              {noteText.trim() && (
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setNoteText("")} className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5">Annuler</button>
                  <button
                    onClick={handleAddNote}
                    disabled={saving}
                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {saving ? "…" : "Publier la note"}
                  </button>
                </div>
              )}
            </div>

            {/* Timeline */}
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun événement enregistré.</p>
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
          </div>
        </div>
      </div>
    </AgentShell>
  );
}

// ─── Stepper simplifié ────────────────────────────────────────────────────────

function AgentStepper({ current, onJump, disabled }: {
  current: TicketStatus;
  onJump: (s: TicketStatus) => void;
  disabled: boolean;
}) {
  if (current === "ferme") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold">✕</span>
        Demande fermée sans traitement
      </div>
    );
  }

  const currentIdx = PIPELINE.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {PIPELINE.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        const accent = STATUS_ACCENT[s];
        const canJump = !disabled && i !== currentIdx;

        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              disabled={!canJump}
              onClick={() => onJump(s)}
              className={`flex flex-col items-center gap-1.5 ${canJump ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              title={canJump ? `Passer à "${STATUS_LABELS[s]}"` : STATUS_LABELS[s]}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                active ? `${accent.fill} text-white ring-4 ring-indigo-100 shadow-md`
                : done  ? `${accent.fill} text-white`
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
              <div className="flex-1 h-0.5 mx-2 -mt-4 min-w-[16px]">
                <div className={`h-full rounded-full ${i < currentIdx ? "bg-indigo-400" : "bg-slate-200"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
