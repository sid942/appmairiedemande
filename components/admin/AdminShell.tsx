"use client";

import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE } from "@/lib/demo-store";
import Logo from "@/components/Logo";

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const NAV = [
  { href: "/admin/dashboard", icon: "⊞", label: "Tableau de bord" },
  { href: "/admin/tickets",   icon: "≡", label: "Toutes les demandes" },
  { href: "/admin/carte",     icon: "◎", label: "Carte / Zones" },
  { href: "/admin/services",  icon: "⚙", label: "Services & Agents" },
];

export default function AdminShell({ children, title, subtitle, actions }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    if (!DEMO_MODE) await supabase.auth.signOut();
    router.push("/admin");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-fresnes-700 flex-shrink-0">
        {/* Logo officiel Fresnes sur fond blanc (charte) */}
        <div className="px-4 py-5 border-b border-white/10">
          <Logo size="sm" background tagline="Back-office" className="w-full" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-white text-fresnes-700 shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base w-4 text-center">{icon}</span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bas sidebar */}
        <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-2">
          {DEMO_MODE && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-400/15 border border-amber-300/30 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse flex-shrink-0" />
              <span className="text-xs text-amber-200 font-medium">Mode démo</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <span>↩</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            {title && <h1 className="text-base font-bold text-slate-900">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="lg:hidden text-xs text-slate-500 hover:text-slate-700"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="lg:hidden bg-white border-b border-slate-100 flex">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  active
                    ? "border-fresnes-500 text-fresnes-600"
                    : "border-transparent text-slate-400"
                }`}
              >
                <span>{icon}</span>{label}
              </button>
            );
          })}
        </div>

        {/* Scroll area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
