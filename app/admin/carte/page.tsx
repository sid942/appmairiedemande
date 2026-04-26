"use client";

import dynamic from "next/dynamic";
import AdminShell from "@/components/admin/AdminShell";

// La carte utilise window/document → jamais rendue côté serveur
const MapView = dynamic(() => import("@/components/admin/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-900/20 border-t-blue-900 rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Chargement de la carte…</span>
      </div>
    </div>
  ),
});

export default function CartePage() {
  return (
    <AdminShell
      title="Carte des demandes"
      subtitle="Visualisation géographique · Fresnes (94260)"
    >
      <MapView />
    </AdminShell>
  );
}
