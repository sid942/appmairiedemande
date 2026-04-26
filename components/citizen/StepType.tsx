"use client";

import { TicketType } from "@/types";

const types: {
  value: TicketType;
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: "probleme",
    label: "Signaler un problème",
    desc: "Panne, danger, dégradation",
    icon: "⚠️",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "hover:border-orange-300 hover:shadow-orange-100",
  },
  {
    value: "question",
    label: "Poser une question",
    desc: "Information sur un service",
    icon: "💬",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "hover:border-blue-300 hover:shadow-blue-100",
  },
  {
    value: "demande",
    label: "Faire une demande",
    desc: "Document, autorisation, démarche",
    icon: "📋",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "hover:border-violet-300 hover:shadow-violet-100",
  },
];

export default function StepType({ onSelect }: { onSelect: (t: TicketType) => void }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-2">
          Comment pouvons-nous<br />vous aider ?
        </h1>
        <p className="text-slate-500 text-sm">Choisissez le type de votre demande</p>
      </div>

      <div className="flex flex-col gap-3">
        {types.map(({ value, label, desc, icon, bg, border }, i) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`group relative w-full text-left bg-white rounded-2xl border border-slate-100 p-5 shadow-sm transition-all duration-200 ${border} hover:shadow-lg animate-fade-up`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-base leading-snug">{label}</div>
                <div className="text-sm text-slate-400 mt-0.5">{desc}</div>
              </div>
              <div className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">
        Gratuit · Réponse sous 72h · Sans inscription
      </p>
    </div>
  );
}
