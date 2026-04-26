"use client";

import { TicketType, TicketCategory, TYPE_LABELS } from "@/types";

const categories: {
  value: TicketCategory;
  label: string;
  icon: string;
  bg: string;
  hover: string;
}[] = [
  { value: "eclairage", label: "Éclairage public",    icon: "💡", bg: "bg-yellow-50",  hover: "hover:border-yellow-300 hover:shadow-yellow-50" },
  { value: "voirie",    label: "Voirie / route",      icon: "🚧", bg: "bg-orange-50",  hover: "hover:border-orange-300 hover:shadow-orange-50" },
  { value: "dechets",   label: "Déchets / propreté",  icon: "♻️", bg: "bg-green-50",   hover: "hover:border-green-300 hover:shadow-green-50" },
  { value: "espaces_verts", label: "Espaces verts",   icon: "🌿", bg: "bg-emerald-50", hover: "hover:border-emerald-300 hover:shadow-emerald-50" },
  { value: "autre",     label: "Autre sujet",         icon: "💼", bg: "bg-slate-50",   hover: "hover:border-slate-300 hover:shadow-slate-50" },
];

export default function StepCategory({
  type,
  onSelect,
  onBack,
}: {
  type: TicketType;
  onSelect: (c: TicketCategory) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
          <span>●</span> {TYPE_LABELS[type]}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-2">
          Quel est le sujet ?
        </h1>
        <p className="text-slate-500 text-sm">Sélectionnez la catégorie la plus proche</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map(({ value, label, icon, bg, hover }, i) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`group bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-sm transition-all duration-200 ${hover} hover:shadow-lg animate-fade-up`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center text-2xl mx-auto mb-3 transition-transform duration-200 group-hover:scale-110`}>
              {icon}
            </div>
            <div className="text-sm font-semibold text-slate-700 leading-snug">{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
