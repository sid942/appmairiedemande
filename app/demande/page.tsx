"use client";

import { useState } from "react";
import StepType from "@/components/citizen/StepType";
import StepCategory from "@/components/citizen/StepCategory";
import StepForm from "@/components/citizen/StepForm";
import StepConfirmation from "@/components/citizen/StepConfirmation";
import { TicketType, TicketCategory } from "@/types";

type Step = "type" | "category" | "form" | "confirmation";

const STEP_LABELS = ["Type", "Catégorie", "Détails", "Envoi"];

export default function DemandePage() {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [ticketId, setTicketId] = useState("");
  const [linkedInfo, setLinkedInfo] = useState<{ masterId: string; signalNumber: number } | undefined>(undefined);

  const stepIndex = ["type", "category", "form", "confirmation"].indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">Demande Mairie</span>
          </div>
          {step !== "confirmation" && (
            <span className="text-xs font-medium text-slate-400">
              Étape {stepIndex + 1} / 3
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pb-12">
        {/* Barre de progression */}
        {step !== "confirmation" && (
          <div className="pt-6 pb-2 mb-6">
            {/* Steps pills */}
            <div className="flex items-center gap-1 mb-4">
              {STEP_LABELS.slice(0, 3).map((label, i) => (
                <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                  <div className={`flex items-center gap-1.5 transition-all duration-300 ${
                    i < stepIndex
                      ? "text-blue-600"
                      : i === stepIndex
                      ? "text-blue-600"
                      : "text-slate-300"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i < stepIndex
                        ? "bg-blue-600 text-white"
                        : i === stepIndex
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {i < stepIndex ? "✓" : i + 1}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{label}</span>
                  </div>
                  {i < 2 && (
                    <div className="flex-1 h-0.5 rounded-full mx-1 transition-all duration-500" style={{
                      background: i < stepIndex
                        ? "linear-gradient(90deg, #2563EB, #4F46E5)"
                        : "#E2E8F0"
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "type" && (
          <div className="animate-fade-up">
            <StepType onSelect={(type) => { setSelectedType(type); setStep("category"); }} />
          </div>
        )}
        {step === "category" && selectedType && (
          <div className="animate-fade-up">
            <StepCategory
              type={selectedType}
              onSelect={(cat) => { setSelectedCategory(cat); setStep("form"); }}
              onBack={() => setStep("type")}
            />
          </div>
        )}
        {step === "form" && selectedType && selectedCategory && (
          <div className="animate-fade-up">
            <StepForm
              type={selectedType}
              category={selectedCategory}
              onSuccess={(id, linked) => { setTicketId(id); setLinkedInfo(linked); setStep("confirmation"); }}
              onBack={() => setStep("category")}
            />
          </div>
        )}
        {step === "confirmation" && (
          <div className="animate-fade-up">
            <StepConfirmation
              ticketId={ticketId}
              linkedTo={linkedInfo}
              onNewDemande={() => {
                setStep("type");
                setSelectedType(null);
                setSelectedCategory(null);
                setTicketId("");
                setLinkedInfo(undefined);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
