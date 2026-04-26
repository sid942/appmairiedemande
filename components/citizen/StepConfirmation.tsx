"use client";

import { useState } from "react";

interface Props {
  ticketId: string;
  linkedTo?: { masterId: string; signalNumber: number };
  onNewDemande: () => void;
}

export default function StepConfirmation({ ticketId, linkedTo, onNewDemande }: Props) {
  const ref = ticketId.slice(0, 8).toUpperCase();
  const masterRef = linkedTo?.masterId.slice(0, 8).toUpperCase();
  const [copied, setCopied] = useState(false);

  const trackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/suivi/${ticketId}`
      : `/suivi/${ticketId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* noop */ }
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Suivi de ma demande — Mairie de Fresnes",
          text:  `Suivez l'avancement de ma demande #${ref} auprès de la Mairie de Fresnes.`,
          url:   trackUrl,
        });
        return;
      } catch { /* annulé */ }
    }
    copyLink();
  }

  return (
    <div className="flex flex-col items-center text-center pt-6">
      {/* Cercle succès */}
      <div className="relative mb-6 animate-confetti">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow-md">
          🎉
        </div>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 mb-2 animate-fade-up">
        {linkedTo ? "Signalement enregistré !" : "Demande envoyée !"}
      </h1>
      <p className="text-slate-500 text-sm mb-6 animate-fade-up delay-100 max-w-sm">
        {linkedTo
          ? "Votre signalement a bien été reçu par la Mairie de Fresnes. Vous pouvez en suivre l'avancement grâce au lien ci-dessous."
          : "Votre demande a bien été reçue par la Mairie de Fresnes. Vous pouvez la suivre en temps réel grâce au lien ci-dessous."}
      </p>

      {/* Bandeau "rattachée à une demande existante" */}
      {linkedTo && (
        <div className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 mb-6 animate-fade-up delay-150 text-left flex gap-3">
          <span className="text-lg flex-shrink-0">🔗</span>
          <div>
            <div className="text-xs font-bold text-indigo-900 mb-0.5">
              {linkedTo.signalNumber}<sup>e</sup> signalement pour ce problème
            </div>
            <div className="text-xs text-indigo-800/80 leading-relaxed">
              Notre IA a détecté qu&apos;une demande similaire avait déjà été enregistrée
              {masterRef ? ` (#${masterRef})` : ""}. Vous serez tenu informé(e) de l&apos;avancement —
              les services traitent l&apos;intervention de manière groupée.
            </div>
          </div>
        </div>
      )}

      {/* Lien de suivi — encart principal */}
      <div className="w-full bg-gradient-to-br from-fresnes-500 to-fresnes-700 rounded-2xl p-5 mb-4 animate-fade-up delay-200 shadow-lg shadow-fresnes-500/25">
        <p className="text-fresnes-100 text-xs font-semibold uppercase tracking-widest mb-2">
          Votre lien de suivi
        </p>
        <div className="text-2xl font-black tracking-[0.18em] text-white mb-1">#{ref}</div>
        <div className="text-fresnes-100/80 text-[11px] mb-4 break-all">
          {trackUrl.replace(/^https?:\/\//, "")}
        </div>

        <div className="flex gap-2">
          <a
            href={`/suivi/${ticketId}`}
            className="flex-1 bg-white hover:bg-fresnes-50 text-fresnes-700 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Voir le suivi
          </a>
          <button
            onClick={shareLink}
            className="bg-white/15 hover:bg-white/25 text-white font-semibold text-sm py-2.5 px-3.5 rounded-xl transition-colors flex items-center gap-1.5 border border-white/20"
            title="Partager"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.992 0m5.992 0L15 17m3-1a3 3 0 11-6 0 3 3 0 016 0zM6 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={copyLink}
            className="bg-white/15 hover:bg-white/25 text-white font-semibold text-sm py-2.5 px-3.5 rounded-xl transition-colors flex items-center gap-1.5 border border-white/20"
            title="Copier le lien"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        {copied && (
          <div className="text-fresnes-100 text-[11px] mt-2 font-medium animate-fade-up">
            ✓ Lien copié — collez-le dans un message pour le partager
          </div>
        )}
      </div>

      {/* Astuce */}
      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 animate-fade-up delay-300 text-left flex gap-3">
        <span className="text-lg flex-shrink-0">💡</span>
        <div>
          <div className="text-xs font-bold text-amber-900 mb-0.5">Conservez ce lien</div>
          <div className="text-xs text-amber-800/80 leading-relaxed">
            Bookmarkez la page, envoyez le lien à un voisin concerné, ou partagez-le sur
            le groupe WhatsApp de votre quartier — tout le monde pourra suivre l&apos;avancement.
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full card text-left mb-6 animate-fade-up delay-300">
        <h2 className="font-bold text-slate-700 text-sm mb-4">Ce qui va se passer</h2>
        <div className="flex flex-col gap-0">
          {[
            { icon: "📬", title: "Réception",  desc: "Votre demande est enregistrée et assignée au service compétent", done: true },
            { icon: "🔧", title: "Traitement", desc: "Un agent municipal va examiner votre demande", done: false },
            { icon: "✅", title: "Résolution", desc: "Vous serez contacté(e) et pourrez noter le service", done: false },
          ].map(({ icon, title, desc, done }, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${done ? "bg-emerald-50" : "bg-slate-50"}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${done ? "text-emerald-600" : "text-slate-700"}`}>{title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
              </div>
              {done && (
                <div className="ml-auto">
                  <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Fait</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNewDemande}
        className="w-full py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-fresnes-200 hover:text-fresnes-600 hover:bg-fresnes-50 transition-all text-sm"
      >
        Faire une nouvelle demande
      </button>
    </div>
  );
}
