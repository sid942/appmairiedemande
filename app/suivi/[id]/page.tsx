"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Ticket, TicketNote, TicketStatus,
  STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, TYPE_LABELS,
  getAgeLabel, isOverdue,
} from "@/types";
import { DEMO_MODE, demoGetTicket, demoGetNotes, demoRateTicket } from "@/lib/demo-store";
import Logo from "@/components/Logo";

// Mini-carte chargée dynamiquement (Leaflet client-only)
const SuiviMap = dynamic(() => import("./SuiviMap"), { ssr: false });

// ─── Pipeline visible pour le citoyen ────────────────────────────────────
const PIPELINE: { status: TicketStatus; label: string; desc: string; icon: string }[] = [
  { status: "nouveau",  label: "Reçue",       desc: "Votre demande a été enregistrée",                 icon: "📬" },
  { status: "en_cours", label: "Prise en charge", desc: "Un agent municipal s'occupe de votre demande", icon: "🔧" },
  { status: "transmis", label: "Transmise",   desc: "Transmise au prestataire ou à l'équipe terrain",   icon: "🚚" },
  { status: "termine",  label: "Résolue",     desc: "Votre demande est terminée",                       icon: "✅" },
];

// Événements visibles publiquement (on cache : note interne, agent_changed, priority_changed)
const PUBLIC_EVENTS: TicketNote["type"][] = [
  "created",
  "status_changed",
  "service_changed",
  "citoyen_contacte",
  "transmis_prestataire",
  "rated",
];

const EVENT_LABELS: Partial<Record<TicketNote["type"], string>> = {
  created:              "Demande reçue",
  status_changed:       "Avancement",
  service_changed:      "Assignée à un service",
  citoyen_contacte:     "Vous avez été contacté(e)",
  transmis_prestataire: "Transmise au prestataire",
  rated:                "Avis déposé",
};

const EVENT_ICONS: Partial<Record<TicketNote["type"], string>> = {
  created:              "📥",
  status_changed:       "🔄",
  service_changed:      "🏢",
  citoyen_contacte:     "📞",
  transmis_prestataire: "🚚",
  rated:                "⭐",
};

// ─── Page ────────────────────────────────────────────────────────────────

export default function SuiviPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ticket,  setTicket]  = useState<Ticket | null>(null);
  const [notes,   setNotes]   = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      const t = demoGetTicket(id);
      setTicket(t);
      setNotes(demoGetNotes(id).filter((n) => PUBLIC_EVENTS.includes(n.type)));
      setLoading(false);
    }
  }, [id]);

  // ── Partage ──────────────────────────────────────────────────────────
  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = "Suivi de demande — Mairie de Fresnes";
    const text  = `Demande #${id.slice(0, 8).toUpperCase()} en cours de traitement par la Mairie de Fresnes.`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch { /* annulé */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch { /* noop */ }
  }

  // ── Notation citoyen ─────────────────────────────────────────────────
  function handleRate(stars: number, comment?: string) {
    if (!ticket) return;
    if (DEMO_MODE) {
      const updated = demoRateTicket(id, stars, comment);
      if (updated) {
        setTicket(updated);
        setNotes(demoGetNotes(id).filter((n) => PUBLIC_EVENTS.includes(n.type)));
      }
    }
  }

  // ── States d'affichage ───────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Chargement de votre demande…
        </div>
      </Shell>
    );
  }

  if (!ticket) {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Demande introuvable</h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Le lien de suivi est peut-être incorrect ou la demande a été supprimée.
            Vérifiez l&apos;adresse complète envoyée par la mairie.
          </p>
        </div>
      </Shell>
    );
  }

  const ref     = ticket.id.slice(0, 8).toUpperCase();
  const closed  = ticket.statut === "termine" || ticket.statut === "ferme";
  const overdue = isOverdue(ticket);
  const currentIdx =
    ticket.statut === "ferme" ? -1 : Math.max(0, PIPELINE.findIndex((p) => p.status === ticket.statut));

  return (
    <Shell>
      {/* ─── En-tête : référence + partage ───────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Suivi de demande
          </div>
          <div className="text-2xl font-black tracking-[0.15em] text-fresnes-700 mt-0.5">
            #{ref}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Déposée {getAgeLabel(ticket.created_at).toLowerCase()}
          </div>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-fresnes-500 hover:bg-fresnes-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-fresnes-500/20 transition-colors"
        >
          {shareCopied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Lien copié !
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.992 0m5.992 0L15 17m3-1a3 3 0 11-6 0 3 3 0 016 0zM6 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Partager
            </>
          )}
        </button>
      </div>

      {/* ─── Carte récap ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-5">
        <div className="bg-fresnes-50 px-5 py-4 flex items-start gap-4 border-b border-fresnes-100">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            {CATEGORY_ICONS[ticket.categorie]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-fresnes-800 leading-tight">
              {CATEGORY_LABELS[ticket.categorie]}
            </div>
            <div className="text-xs text-fresnes-700/70 mt-0.5">
              {TYPE_LABELS[ticket.type]}
            </div>
          </div>
          {closed ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {ticket.statut === "ferme" ? "Fermée" : "Résolue"}
            </span>
          ) : overdue ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
              ⏰ En attente
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-fresnes-100 text-fresnes-700">
              En traitement
            </span>
          )}
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Adresse" icon="📍" value={ticket.adresse} />
          <Field
            label="Service en charge"
            icon="🏢"
            value={ticket.service?.nom ?? "En cours d'attribution…"}
          />
        </div>

        {/* Mini-carte */}
        {ticket.lat != null && ticket.lng != null && (
          <div className="border-t border-slate-100 h-48">
            <SuiviMap lat={ticket.lat} lng={ticket.lng} label={ticket.adresse} />
          </div>
        )}
      </div>

      {/* ─── Stepper ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          Avancement de votre demande
        </h2>

        {ticket.statut === "ferme" ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              ✕
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">Demande fermée</div>
              <div className="text-xs text-slate-500">Cette demande a été clôturée sans traitement.</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {PIPELINE.map((step, i) => {
              const done   = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.status} className="flex gap-3">
                  {/* Colonne icône + ligne */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0 transition-all ${
                        active
                          ? "bg-fresnes-500 text-white ring-4 ring-fresnes-100 shadow-md"
                          : done
                          ? "bg-fresnes-500 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : step.icon}
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 my-1 min-h-[18px] rounded-full ${
                          done ? "bg-fresnes-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  {/* Libellé */}
                  <div className={`pb-5 flex-1 min-w-0 ${i === PIPELINE.length - 1 ? "pb-0" : ""}`}>
                    <div
                      className={`text-sm font-bold ${
                        active ? "text-fresnes-700" : done ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                      {active && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-fresnes-600 bg-fresnes-50 px-2 py-0.5 rounded-full">
                          En cours
                        </span>
                      )}
                    </div>
                    <div className={`text-xs leading-snug mt-0.5 ${active ? "text-slate-600" : "text-slate-400"}`}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Notation (si terminé et pas encore noté) ────────────────── */}
      {ticket.statut === "termine" && !ticket.rating && (
        <RatingBlock onSubmit={handleRate} />
      )}
      {ticket.rating && (
        <RatingDoneBlock rating={ticket.rating} comment={ticket.rating_comment} />
      )}

      {/* ─── Historique public ───────────────────────────────────────── */}
      {notes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            Historique
          </h2>
          <div className="flex flex-col gap-0">
            {notes.map((n, i) => (
              <div key={n.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-sm flex-shrink-0 border border-slate-100">
                    {EVENT_ICONS[n.type] ?? "•"}
                  </div>
                  {i < notes.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 leading-snug">
                    {EVENT_LABELS[n.type] ?? n.contenu}
                  </div>
                  {/* Détail public sans nom d'agent — on filtre les libellés type "Agent assigné : Pierre" */}
                  {!n.contenu.toLowerCase().startsWith("agent assigné") && (
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">{n.contenu}</div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(n.created_at).toLocaleString("fr-FR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bandeau infos pratiques ─────────────────────────────────── */}
      <div className="bg-fresnes-50 border border-fresnes-100 rounded-2xl p-4 text-xs text-fresnes-800/80 leading-relaxed">
        <div className="font-bold mb-1.5 text-fresnes-800">💡 Bon à savoir</div>
        Vous serez contacté(e) par la mairie au <strong>{ticket.contact}</strong> dès qu&apos;une réponse
        sera disponible. Conservez ce lien et partagez-le si besoin avec un voisin concerné.
      </div>

      {/* Footer mairie */}
      <div className="text-center text-[11px] text-slate-400 mt-6 pb-6">
        Demande #{ref} — Mairie de Fresnes
        <br />
        Plateforme officielle de gestion des demandes citoyens
      </div>
    </Shell>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-fresnes-50/40 via-white to-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
          <Logo size="sm" />
          <a
            href="/demande"
            className="text-xs font-semibold text-fresnes-600 hover:text-fresnes-700"
          >
            + Nouvelle demande
          </a>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-5 pt-6">{children}</main>
    </div>
  );
}

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

// ─── Notation ────────────────────────────────────────────────────────────

function RatingBlock({ onSubmit }: { onSubmit: (stars: number, comment?: string) => void }) {
  const [hover, setHover] = useState(0);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (stars === 0) return;
    setSubmitted(true);
    onSubmit(stars, comment);
  }

  if (submitted) return null;

  return (
    <div className="bg-gradient-to-br from-fresnes-500 to-fresnes-700 rounded-2xl p-5 mb-5 text-white shadow-lg shadow-fresnes-500/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">⭐</span>
        <h2 className="text-base font-bold">Comment évaluez-vous le traitement ?</h2>
      </div>
      <p className="text-xs text-fresnes-100 mb-4">
        Votre avis aide la mairie à améliorer ses services.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            className="text-3xl transition-transform hover:scale-110 active:scale-95"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          >
            <span className={(hover || stars) >= n ? "text-yellow-300 drop-shadow" : "text-white/30"}>
              ★
            </span>
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-xs font-semibold text-fresnes-100">
            {["Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Excellent"][stars - 1]}
          </span>
        )}
      </div>

      {stars > 0 && (
        <div className="animate-fade-up">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un commentaire à ajouter ? (facultatif)"
            rows={2}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none mb-3"
          />
          <button
            onClick={submit}
            className="w-full bg-white hover:bg-fresnes-50 text-fresnes-700 font-bold py-2.5 rounded-xl transition-colors text-sm"
          >
            Envoyer mon avis
          </button>
        </div>
      )}
    </div>
  );
}

function RatingDoneBlock({ rating, comment }: { rating: number; comment?: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-emerald-800">Merci pour votre avis !</div>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`text-base ${n <= rating ? "text-yellow-500" : "text-slate-200"}`}>
                ★
              </span>
            ))}
            <span className="text-xs text-emerald-700 ml-1 font-semibold">{rating}/5</span>
          </div>
          {comment && (
            <div className="text-xs text-emerald-700/80 mt-2 italic leading-snug">« {comment} »</div>
          )}
        </div>
      </div>
    </div>
  );
}
