"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DEMO_MODE,
  demoGetServiceSession,
  demoServiceLogout,
  ServiceSession,
} from "@/lib/demo-store";
import Logo from "@/components/Logo";

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function ServiceShell({ children, title, subtitle, actions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<ServiceSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!DEMO_MODE) { setReady(true); return; }
    const s = demoGetServiceSession();
    if (!s) {
      router.replace("/service");
      return;
    }
    setSession(s);
    setReady(true);
  }, [router]);

  function handleLogout() {
    demoServiceLogout();
    router.push("/service");
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-fresnes-700 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" background />
            <div className="hidden sm:block min-w-0">
              <div className="text-xs uppercase tracking-widest text-fresnes-100/70 font-semibold">
                Portail service
              </div>
              <div className="text-sm font-bold truncate">{session?.service_nom}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/service/dashboard")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/service/dashboard"
                  ? "bg-white text-fresnes-700"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Mes demandes
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-white/70 hover:text-white"
              title="Déconnexion"
            >
              ↩ Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {(title || actions) && (
          <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
            <div>
              {title && <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
