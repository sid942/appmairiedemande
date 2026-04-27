"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  DEMO_MODE, demoGetTicket, demoGetNotes,
} from "@/lib/demo-store";
import {
  Ticket, TicketNote,
  CATEGORY_LABELS, CATEGORY_ICONS,
  STATUS_LABELS, PRIORITY_LABELS,
  TYPE_LABELS,
  getAgeLabel,
} from "@/types";

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

export default function TicketPrintPage() {
  const params = useParams<{ id: string }>();
  const id     = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes,  setNotes]  = useState<TicketNote[]>([]);
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setTicket(demoGetTicket(id));
      setNotes(demoGetNotes(id));
    }
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (ready && ticket) {
      // Slight delay so the page fully renders before print dialog
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [ready, ticket]);

  if (!ready) return null;

  if (!ticket) return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      Demande introuvable.
    </div>
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm 1.8cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: white; color: #1e293b; }
      `}</style>

      {/* Print button - hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-fresnes-700 hover:bg-fresnes-800 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg"
        >
          🖨️ Imprimer / Sauvegarder PDF
        </button>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg shadow"
        >
          ✕ Fermer
        </button>
      </div>

      <div className="max-w-[720px] mx-auto px-8 py-8 print:p-0">

        {/* ── En-tête mairie ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-slate-200">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="w-14 h-14 bg-fresnes-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow">
              F
            </div>
            <div>
              <div className="text-xl font-extrabold text-fresnes-700 leading-tight">Ville de Fresnes</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Gestion des demandes citoyennes
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fiche demande</div>
            <div className="text-sm font-mono font-bold text-slate-700 mt-0.5">
              #{ticket.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Imprimé le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* ── Titre demande ────────────────────────────────────────── */}
        <div className="mb-6 flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
            {CATEGORY_ICONS[ticket.categorie]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-slate-900">{CATEGORY_LABELS[ticket.categorie]}</h1>
            <div className="flex items-center gap-3 flex-wrap mt-1.5">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {STATUS_LABELS[ticket.statut]}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {PRIORITY_LABELS[ticket.priorite]}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {TYPE_LABELS[ticket.type]}
              </span>
            </div>
          </div>
        </div>

        {/* ── Grille infos ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InfoBlock label="Adresse" value={ticket.adresse} />
          <InfoBlock label="Date de signalement" value={formatDate(ticket.created_at)} />
          <InfoBlock label="Ancienneté" value={getAgeLabel(ticket.created_at)} />
          {ticket.dispatched_at && (
            <InfoBlock label="Transmis le" value={formatDate(ticket.dispatched_at)} />
          )}
        </div>

        {/* ── Description ──────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Description de la demande
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200">
            {ticket.description}
          </div>
        </div>

        {/* ── Contact citoyen ──────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {ticket.nom && <InfoBlock label="Nom citoyen" value={ticket.nom} />}
          <InfoBlock label="Contact" value={ticket.contact} />
        </div>

        {/* ── Affectation ──────────────────────────────────────────── */}
        {(ticket.service_id || ticket.agent_id) && (
          <div className="mb-6 bg-fresnes-50 border border-fresnes-200 rounded-xl p-4">
            <div className="text-[10px] font-bold text-fresnes-600 uppercase tracking-widest mb-2">Affectation</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {ticket.service_id && (
                <div>
                  <span className="text-xs text-slate-400 font-semibold">Service · </span>
                  <span className="font-semibold text-slate-700">
                    {(ticket.service as { nom?: string })?.nom ?? ticket.service_id}
                  </span>
                </div>
              )}
              {ticket.agent_id && (
                <div>
                  <span className="text-xs text-slate-400 font-semibold">Agent · </span>
                  <span className="font-semibold text-slate-700">
                    {(ticket.agent as { nom?: string })?.nom ?? ticket.agent_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Photo jointe ─────────────────────────────────────────── */}
        {ticket.photo_url && (
          <div className="mb-6">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Photo jointe</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ticket.photo_url} alt="Photo jointe" className="rounded-xl max-h-56 w-full object-cover border border-slate-200" />
          </div>
        )}

        {/* ── Historique ───────────────────────────────────────────── */}
        {notes.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Historique ({notes.length} événements)
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span className="text-base flex-shrink-0 mt-0.5">{NOTE_ICONS[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-700 font-medium leading-snug">{n.contenu}</div>
                    {n.author && (
                      <div className="text-[11px] text-slate-400 mt-0.5 font-semibold">{n.author}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                    {new Date(n.created_at).toLocaleString("fr-FR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pied de page ─────────────────────────────────────────── */}
        <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <span>Ville de Fresnes — Gestion des demandes citoyennes</span>
          <span>#{ticket.id.toUpperCase()}</span>
        </div>
      </div>
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
