"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DEMO_MODE,
  demoGetAgentSession,
  demoAgentLogout,
  AgentSession,
} from "@/lib/demo-store";
import Logo from "@/components/Logo";

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AgentShell({ children, title, subtitle, actions }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    if (!DEMO_MODE) { setReady(true); return; }
    const s = demoGetAgentSession();
    if (!s) { router.replace("/agent"); return; }
    setSession(s);
    setReady(true);
  }, [router]);

  function handleLogout() {
    demoAgentLogout();
    router.push("/agent");
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Chargement…
      </div>
    );
  }

  const navItems = [
    { href: "/agent/dashboard", label: "Mes tâches", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          {/* Left: logo + identité */}
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" background />
            <div className="hidden sm:block min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-indigo-200/70 font-semibold">
                Portail agent
              </div>
              <div className="text-sm font-bold truncate leading-tight">
                {session?.agent_nom}
              </div>
              {session?.service_nom && (
                <div className="text-[10px] text-indigo-200/60 truncate">{session.service_nom}</div>
              )}
            </div>
          </div>

          {/* Center: nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-white text-indigo-700"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: profil + déconnexion */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <div className="w-5 h-5 bg-indigo-300 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-900 flex-shrink-0">
                {session?.agent_nom?.charAt(0) ?? "?"}
              </div>
              <span className="text-xs text-white/90 font-medium truncate max-w-[120px]">
                {session?.agent_nom}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-white/70 hover:text-white transition-colors"
              title="Déconnexion"
            >
              ↩ Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenu ─────────────────────────────────────────────────── */}
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
