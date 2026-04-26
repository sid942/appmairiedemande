"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_MODE, demoServiceLogin, demoGetServiceSession } from "@/lib/demo-store";
import Logo from "@/components/Logo";

export default function ServiceLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (DEMO_MODE && demoGetServiceSession()) {
      router.replace("/service/dashboard");
    }
  }, [router]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (DEMO_MODE) {
      const session = demoServiceLogin(email, password);
      if (!session) {
        setError("E-mail ou mot de passe incorrect.");
        setLoading(false);
        return;
      }
      router.push("/service/dashboard");
      return;
    }
    setError("Le mode production n'est pas encore branché.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fresnes-900 via-fresnes-800 to-fresnes-700 flex items-center justify-center px-5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fresnes-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fresnes-300/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <Logo size="xl" background className="mb-4 shadow-2xl shadow-fresnes-900/40" />
          <h1 className="text-2xl font-extrabold text-white">Portail Service</h1>
          <p className="text-fresnes-100 text-sm mt-1">Accès aux demandes de votre service</p>
          {DEMO_MODE && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-300/30">
              <span className="w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse" />
              Mode démo · mot de passe par défaut : <strong>fresnes2026</strong>
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-fresnes-100 uppercase tracking-wide block mb-2">
                E-mail du service
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voirie@mairie.fr"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-fresnes-100 uppercase tracking-wide block mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-300/40 text-red-100 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-fresnes-50 text-fresnes-700 font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-fresnes-900/30 disabled:opacity-50 active:scale-[0.98] mt-1"
            >
              {loading ? "Connexion…" : "Accéder à mes demandes →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-fresnes-200/70 mt-6">
          Vous êtes administrateur ?{" "}
          <a href="/admin" className="underline hover:text-white">Espace mairie</a>
        </p>
      </div>
    </div>
  );
}
