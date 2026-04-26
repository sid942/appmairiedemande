"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DEMO_MODE, demoGetTicket, demoGetNotes,
  demoGetServiceSession, demoServiceUpdateTicket,
} from "@/lib/demo-store";
import {
  Ticket, TicketNote, TicketStatus,
  STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, TYPE_LABELS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  getAgeLabel,
} from "@/types";
import ServiceShell from "@/components/service/ServiceShell";

const PIPELINE: TicketStatus[] = ["nouveau", "en_cours", "transmis", "termine"];

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

export default function ServiceTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [serviceName, setServiceName] = useState("");

  useEffect(() => {
    if (!DEMO_MODE) return;
    const session = demoGetServiceSession();
    if (!session) return;
    setServiceName(session.service_nom);
    const t = demoGetTicket(id);
    if (!t) {
      setLoading(false);
      return;
    }
    if (t.service_id !== session.service_id) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setTicket(t);
    setNotes(demoGetNotes(id));
    setLoading(false);
  }, [id]);

  function reload() {
    setTicket(demoGetTicket(id));
    setNotes(demoGetNotes(id));
  }

  function changeStatus(s: TicketStatus) {
    if (!ticket || saving) return;
    setSaving(true);
    demoServiceUpdateTicket(id, { statut: s }, serviceName);
    reload();
    setSaving(false);
  }

  function submitNote() {
    if (!noteText.trim() || saving) return;
    setSaving(true);
    demoServiceUpdateTicket(id, { note: noteText.trim() }, serviceName);
    setNoteText("");
    reload();
    setSaving(false);
  }

  if (loading) {
    return (
      <ServiceShell>
        <div className="text-center py-12 text-sm text-slate-400">Chargement…</div>
      </ServiceShell>
    );
  }

  if (unauthorized) {
    return (
      <ServiceShell title="Accès refusé">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          Cette demande est attribuée à un autre service. Vous ne pouvez consulter
          que les demandes de votre propre service.
        </div>
      </ServiceShell>
    );
  }

  if (!ticket) {
    return (
      <ServiceShell title="Demande introuvable">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
          Cette demande n&apos;existe pas ou a été supprimée.
        </div>
      </ServiceShell>
    );
  }

  const ref = ticket.id.slice(0, 8).toUpperCase();
  const currentIdx = PIPELINE.indexOf(ticket.statut);

  return (
    <ServiceShell
      title={`Demande #${ref}`}
      subtitle={`${CATEGORY_LABELS[ticket.categorie]} · ${TYPE_LABELS[ticket.type]}`}
      actions={
        <button
          onClick={() => router.push("/service/dashboard")}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2"
        >
          ← Retour
        </button>
      }
    >
      {/* Bandeau dispatch */}
      {ticket.dispatched_at && (
        <div className="bg-gradient-to-br from-fresnes-500 to-fresnes-700 text-white rounded-2xl p-5 mb-5 shadow-lg shadow-fresnes-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              📧
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Demande transmise par la mairie</div>
              <div className="text-xs text-fresnes-100 mt-0.5">
                Reçue le{" "}
                {new Date(ticket.dispatched_at).toLocaleString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}{" "}
                · à : {ticket.dispatched_to?.join(", ")}
              </div>
              {ticket.dispatch_message && (
                <div className="mt-2 text-xs bg-white/10 rounded-lg p-2.5 italic">
                  « {ticket.dispatch_message} »
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Colonne principale */}
        <div className="flex flex-col gap-5">
          {/* Recap */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-fresnes-50 px-5 py-4 flex items-start gap-4 border-b border-fresnes-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                {CATEGORY_ICONS[ticket.categorie]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-base font-bold text-slate-900">{CATEGORY_LABELS[ticket.categorie]}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_COLORS[ticket.priorite]}`}>
                    {PRIORITY_LABELS[ticket.priorite]}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {TYPE_LABELS[ticket.type]} · #{ref} · Reçue {getAgeLabel(ticket.created_at).toLowerCase()}
                </div>
              </div>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-x-5 gap-y-3 text-sm">
              <Field label="Adresse" icon="📍" value={ticket.adresse} />
              <Field label="Citoyen" icon="👤" value={ticket.nom ?? "Anonyme"} />
              <Field label="Contact" icon={ticket.contact.includes("@") ? "✉️" : "📞"} value={ticket.contact} />
              <Field label="Créée le" icon="📅" value={new Date(ticket.created_at).toLocaleString("fr-FR", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })} />
            </div>
          </div>

          {/* Description */}
          <Section title="Description">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </Section>

          {/* Photo */}
          {ticket.photo_url && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Photo jointe</h3>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ticket.photo_url} alt="Photo" className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Historique */}
          <Section title="Historique">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun événement.</p>
            ) : (
              <div className="flex flex-col">
                {notes.map((n, i) => (
                  <div key={n.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-sm flex-shrink-0 border border-slate-100">
                        {NOTE_ICONS[n.type] ?? "•"}
                      </div>
                      {i < notes.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 leading-snug">
                        {n.contenu}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {n.author && <span className="font-semibold text-slate-500">{n.author} · </span>}
                        {new Date(n.created_at).toLocaleString("fr-FR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ajouter une mise à jour visible par l'admin…"
                rows={2}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40 focus:bg-white resize-none"
              />
              {noteText.trim() && (
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setNoteText("")}
                    className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submitNote}
                    disabled={saving}
                    className="text-xs font-semibold bg-fresnes-500 hover:bg-fresnes-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Publier la mise à jour
                  </button>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar : statut */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Mettre à jour le statut
              </h3>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {PIPELINE.map((s, i) => {
                const active = ticket.statut === s;
                const done = i < currentIdx;
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={saving || active}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all ${
                      active
                        ? "bg-fresnes-500 text-white shadow-md"
                        : done
                        ? "bg-fresnes-50 text-fresnes-700 border border-fresnes-100"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-fresnes-300 hover:bg-fresnes-50/50"
                    } disabled:cursor-default`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-white/20">
                      {done ? "✓" : i + 1}
                    </span>
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              💡 L&apos;admin et le citoyen voient vos mises à jour en temps réel.
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
            <div className="font-bold mb-1">Vos actions</div>
            En tant que service, vous pouvez faire évoluer le statut, ajouter
            des notes visibles par l&apos;admin et contacter le citoyen via les
            coordonnées ci-contre.
          </div>
        </div>
      </div>
    </ServiceShell>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Field({ label, icon, value }: { label: string; icon: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-medium text-slate-700">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}
