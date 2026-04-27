"use client";

import { useEffect, useState } from "react";
import StepType from "@/components/citizen/StepType";
import StepCategory from "@/components/citizen/StepCategory";
import StepForm from "@/components/citizen/StepForm";
import StepConfirmation from "@/components/citizen/StepConfirmation";
import { TicketType, TicketCategory } from "@/types";

type Step = "type" | "category" | "form" | "confirmation";

// Auto-resize: envoie la hauteur réelle au parent chaque fois que le DOM change
function useAutoResize() {
  useEffect(() => {
    function sendHeight() {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "mairie-embed-resize", height: h }, "*");
    }

    sendHeight();

    const ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);

    return () => ro.disconnect();
  }, []);
}

export default function EmbedPage() {
  useAutoResize();

  const [step,             setStep]             = useState<Step>("type");
  const [selectedType,     setSelectedType]     = useState<TicketType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [ticketId,         setTicketId]         = useState("");
  const [linkedInfo,       setLinkedInfo]       = useState<{ masterId: string; signalNumber: number } | undefined>(undefined);

  const stepIndex = ["type", "category", "form", "confirmation"].indexOf(step);
  const isDone    = step === "confirmation";

  function reset() {
    setStep("type");
    setSelectedType(null);
    setSelectedCategory(null);
    setTicketId("");
    setLinkedInfo(undefined);
  }

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* ── Mini header brandé Fresnes ──────────────────────────────── */}
      <div className="bg-gradient-to-r from-fresnes-700 to-fresnes-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Carré logo */}
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white font-black text-sm shadow">
            F
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Ville de Fresnes</div>
            <div className="text-fresnes-200/70 text-[10px] font-semibold uppercase tracking-widest leading-none">
              Signalement citoyen
            </div>
          </div>
        </div>

        {/* Progress pill */}
        {!isDone && (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`transition-all duration-300 rounded-full ${
                  n - 1 < stepIndex
                    ? "w-5 h-2 bg-white"
                    : n - 1 === stepIndex
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Contenu du wizard ───────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">

        {step === "type" && (
          <div className="animate-fade-up">
            <StepType
              onSelect={(type) => { setSelectedType(type); setStep("category"); }}
            />
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
              onSuccess={(id, linked) => {
                setTicketId(id);
                setLinkedInfo(linked);
                setStep("confirmation");
              }}
              onBack={() => setStep("category")}
            />
          </div>
        )}

        {step === "confirmation" && (
          <div className="animate-fade-up">
            <StepConfirmation
              ticketId={ticketId}
              linkedTo={linkedInfo}
              onNewDemande={reset}
            />
          </div>
        )}
      </div>

      {/* ── Footer discret ──────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-5 py-3 text-center">
        <p className="text-[10px] text-slate-300 font-medium">
          Portail officiel · Ville de Fresnes · Val-de-Marne
        </p>
      </div>
    </div>
  );
}
