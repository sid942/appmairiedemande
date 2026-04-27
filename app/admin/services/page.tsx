"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  DEMO_MODE,
  demoGetServices, demoGetAgents, demoGetRouting,
  demoCreateService, demoUpdateService, demoDeleteService,
  demoCreateAgent, demoUpdateAgent, demoDeleteAgent,
  demoUpdateRouting,
} from "@/lib/demo-store";
import { Service, Agent, TicketCategory, CATEGORY_LABELS, CATEGORY_ICONS } from "@/types";

const CATEGORIES: TicketCategory[] = ["eclairage", "voirie", "dechets", "espaces_verts", "autre"];

// ─── Types ────────────────────────────────────────────────────────────────

interface EditServiceState {
  type: "service";
  id: string;
  nom: string;
  email: string;
  password: string;
  cc_emails: string;
}

interface EditAgentState {
  type: "agent";
  id: string;
  nom: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  service_id: string;
}

type EditState = EditServiceState | EditAgentState;

interface NewAgentForm {
  nom: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

const EMPTY_AGENT_FORM: NewAgentForm = { nom: "", email: "", password: "", phone: "", role: "" };

// ─── Page principale ──────────────────────────────────────────────────────

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [agents,   setAgents]   = useState<Agent[]>([]);
  const [routing,  setRouting]  = useState<Record<TicketCategory, string>>({} as Record<TicketCategory, string>);

  // Formulaire nouveau service
  const [showAddSvc,     setShowAddSvc]     = useState(false);
  const [newSvcNom,      setNewSvcNom]      = useState("");
  const [newSvcEmail,    setNewSvcEmail]    = useState("");
  const [newSvcPassword, setNewSvcPassword] = useState("");
  const [newSvcCc,       setNewSvcCc]       = useState("");

  // Formulaire nouvel agent
  const [addAgentFor, setAddAgentFor] = useState<string | null>(null);
  const [newAgent,    setNewAgent]    = useState<NewAgentForm>(EMPTY_AGENT_FORM);

  // Edition inline
  const [editing, setEditing] = useState<EditState | null>(null);

  // Services dépliés
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Onglet actif dans la card d'ajout d'agent
  const [showCredentials, setShowCredentials] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    if (DEMO_MODE) {
      setServices(demoGetServices());
      setAgents(demoGetAgents());
      setRouting(demoGetRouting());
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleCredentials(id: string) {
    setShowCredentials((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function agentsFor(serviceId: string) {
    return agents.filter((a) => a.service_id === serviceId);
  }

  // ── CRUD Services ────────────────────────────────────────────────────────

  function handleAddService() {
    if (!newSvcNom.trim()) return;
    if (DEMO_MODE) {
      const cc = newSvcCc.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      demoCreateService(newSvcNom, newSvcEmail, newSvcPassword || undefined, cc.length ? cc : undefined);
    }
    setNewSvcNom(""); setNewSvcEmail(""); setNewSvcPassword(""); setNewSvcCc("");
    setShowAddSvc(false);
    reload();
  }

  function handleSaveService(id: string) {
    if (!editing || editing.type !== "service") return;
    if (DEMO_MODE) {
      const cc = editing.cc_emails.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      demoUpdateService(id, {
        nom:      editing.nom,
        email:    editing.email,
        password: editing.password?.trim() || undefined,
        cc_emails: cc.length ? cc : undefined,
      });
    }
    setEditing(null);
    reload();
  }

  function handleDeleteService(id: string, nom: string) {
    if (!window.confirm(`Supprimer le service "${nom}" et tous ses agents ?`)) return;
    if (DEMO_MODE) demoDeleteService(id);
    reload();
  }

  // ── CRUD Agents ───────────────────────────────────────────────────────────

  function handleAddAgent(serviceId: string) {
    if (!newAgent.nom.trim()) return;
    if (DEMO_MODE) {
      demoCreateAgent(newAgent.nom, serviceId, {
        email:    newAgent.email    || undefined,
        password: newAgent.password || undefined,
        phone:    newAgent.phone    || undefined,
        role:     newAgent.role     || undefined,
      });
    }
    setNewAgent(EMPTY_AGENT_FORM);
    setAddAgentFor(null);
    reload();
  }

  function handleSaveAgent(id: string) {
    if (!editing || editing.type !== "agent") return;
    if (DEMO_MODE) {
      demoUpdateAgent(id, {
        nom:        editing.nom,
        service_id: editing.service_id,
        email:      editing.email    || undefined,
        password:   editing.password || undefined,
        phone:      editing.phone    || undefined,
        role:       editing.role     || undefined,
      });
    }
    setEditing(null);
    reload();
  }

  function handleDeleteAgent(id: string, nom: string) {
    if (!window.confirm(`Supprimer l'agent "${nom}" ?`)) return;
    if (DEMO_MODE) demoDeleteAgent(id);
    reload();
  }

  // ── Routage ───────────────────────────────────────────────────────────────

  function handleRoutingChange(cat: TicketCategory, serviceId: string) {
    if (DEMO_MODE) demoUpdateRouting(cat, serviceId);
    reload();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminShell
      title="Services & Agents"
      subtitle={`${services.length} service${services.length > 1 ? "s" : ""} · ${agents.length} agent${agents.length > 1 ? "s" : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <a
            href="/agent"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-fresnes-700 border border-fresnes-200 rounded-lg hover:bg-fresnes-50 transition-colors"
          >
            👤 Portail agent →
          </a>
          <button
            onClick={() => { setShowAddSvc(true); setEditing(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span> Ajouter un service
          </button>
        </div>
      }
    >
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* ── Formulaire nouveau service ───────────────────────────────── */}
        {showAddSvc && (
          <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-blue-900" />
              <h2 className="text-sm font-bold text-slate-800">Nouveau service</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                autoFocus
                placeholder="Nom du service *"
                value={newSvcNom}
                onChange={(e) => setNewSvcNom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
              <input
                placeholder="E-mail principal *"
                type="email"
                value={newSvcEmail}
                onChange={(e) => setNewSvcEmail(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
              <input
                placeholder="Mot de passe portail service"
                type="text"
                value={newSvcPassword}
                onChange={(e) => setNewSvcPassword(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
              <input
                placeholder="E-mails en copie (CC) — séparés par virgule"
                value={newSvcCc}
                onChange={(e) => setNewSvcCc(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fresnes-500/20 focus:border-fresnes-500/40"
              />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={() => { setShowAddSvc(false); setNewSvcNom(""); setNewSvcEmail(""); setNewSvcPassword(""); setNewSvcCc(""); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleAddService}
                disabled={!newSvcNom.trim() || !newSvcEmail.trim()}
                className="px-4 py-2 bg-fresnes-500 hover:bg-fresnes-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
              >
                Créer le service
              </button>
            </div>
          </div>
        )}

        {/* ── Liste des services ───────────────────────────────────────── */}
        <div className="space-y-3">
          {services.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="text-3xl mb-2">🏢</div>
              <p className="text-slate-500 text-sm">Aucun service créé.</p>
              <button onClick={() => setShowAddSvc(true)} className="mt-3 text-sm text-blue-900 font-medium hover:underline">
                Créer le premier service →
              </button>
            </div>
          )}

          {services.map((svc) => {
            const svcAgents = agentsFor(svc.id);
            const isOpen    = expanded.has(svc.id);
            const isEditing = editing?.type === "service" && editing.id === svc.id;

            return (
              <div key={svc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

                {/* En-tête service */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-900/8 flex items-center justify-center flex-shrink-0 border border-blue-900/10">
                    <span className="text-blue-900 text-base font-black">{svc.nom.charAt(0)}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex-1 grid sm:grid-cols-2 gap-2">
                      <input autoFocus placeholder="Nom" value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20" />
                      <input type="email" placeholder="E-mail" value={(editing as EditServiceState).email} onChange={(e) => setEditing({ ...editing, email: e.target.value } as EditServiceState)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20" />
                      <input placeholder="Mot de passe portail" type="text" value={(editing as EditServiceState).password} onChange={(e) => setEditing({ ...editing, password: e.target.value } as EditServiceState)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20" />
                      <input placeholder="CC (emails séparés par virgule)" value={(editing as EditServiceState).cc_emails} onChange={(e) => setEditing({ ...editing, cc_emails: e.target.value } as EditServiceState)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fresnes-500/20" />
                      <div className="sm:col-span-2 flex gap-1.5 justify-end">
                        <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200">Annuler</button>
                        <button onClick={() => handleSaveService(svc.id)} className="px-3 py-1.5 bg-fresnes-500 text-white text-xs font-semibold rounded-lg hover:bg-fresnes-600">✓ Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{svc.nom}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="truncate">{svc.email || "—"}</span>
                          {svc.cc_emails && svc.cc_emails.length > 0 && (
                            <span className="text-slate-300">+ {svc.cc_emails.length} CC</span>
                          )}
                          {svc.password && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-fresnes-700 bg-fresnes-50 px-1.5 py-0.5 rounded-full font-semibold">
                              🔑 portail actif
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {svcAgents.length} agent{svcAgents.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-semibold">
                            {svcAgents.filter((a) => a.email).length} compte{svcAgents.filter((a) => a.email).length !== 1 ? "s" : ""} actif{svcAgents.filter((a) => a.email).length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => toggleExpand(svc.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md" title={isOpen ? "Réduire" : "Gérer les agents"}>
                          <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button onClick={() => setEditing({ type: "service", id: svc.id, nom: svc.nom, email: svc.email, password: svc.password ?? "", cc_emails: (svc.cc_emails ?? []).join(", ") })} className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md" title="Modifier">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteService(svc.id, svc.nom)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Supprimer">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Section agents (dépliable) ──────────────────────────── */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50">

                    {/* Header agents */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Agents du service
                      </span>
                      <button
                        onClick={() => { setAddAgentFor(svc.id); setNewAgent(EMPTY_AGENT_FORM); }}
                        className="flex items-center gap-1 text-xs text-blue-900 font-semibold hover:underline"
                      >
                        <span className="text-sm leading-none">+</span> Ajouter un agent
                      </button>
                    </div>

                    {/* Formulaire nouvel agent — avec champs credentials */}
                    {addAgentFor === svc.id && (
                      <div className="px-5 py-4 bg-white border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-[10px] font-black">+</span>
                          Nouvel agent — identité &amp; accès
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Prénom Nom *</label>
                            <input
                              autoFocus
                              placeholder="Ex : Thomas Renard"
                              value={newAgent.nom}
                              onChange={(e) => setNewAgent({ ...newAgent, nom: e.target.value })}
                              onKeyDown={(e) => e.key === "Enter" && handleAddAgent(svc.id)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rôle / Poste</label>
                            <input
                              placeholder="Ex : Chef d'équipe, Technicien…"
                              value={newAgent.role}
                              onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">📧 E-mail de connexion</label>
                            <input
                              type="email"
                              placeholder="thomas.renard@mairie.fr"
                              value={newAgent.email}
                              onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-indigo-50/40"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">🔑 Mot de passe</label>
                            <input
                              type="text"
                              placeholder="Mot de passe temporaire"
                              value={newAgent.password}
                              onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-indigo-50/40"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">📞 Téléphone (optionnel)</label>
                            <input
                              type="tel"
                              placeholder="06 12 34 56 78"
                              value={newAgent.phone}
                              onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 bg-white"
                            />
                          </div>
                        </div>
                        {newAgent.email && newAgent.password && (
                          <div className="mt-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
                            🔐 Cet agent pourra se connecter sur <strong>/agent</strong> avec ces identifiants et gérer uniquement ses demandes.
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 justify-end">
                          <button onClick={() => { setAddAgentFor(null); setNewAgent(EMPTY_AGENT_FORM); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200">Annuler</button>
                          <button onClick={() => handleAddAgent(svc.id)} disabled={!newAgent.nom.trim()} className="px-4 py-1.5 bg-blue-900 disabled:opacity-40 text-white text-xs font-semibold rounded-lg hover:bg-blue-800">
                            Créer l&apos;agent
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Liste agents */}
                    {svcAgents.length === 0 && addAgentFor !== svc.id && (
                      <p className="text-xs text-slate-400 italic px-5 py-4">Aucun agent dans ce service.</p>
                    )}

                    <div className="p-3 space-y-2">
                      {svcAgents.map((agt) => {
                        const isEditingAgent = editing?.type === "agent" && editing.id === agt.id;
                        const showCreds = showCredentials.has(agt.id);

                        return (
                          <div key={agt.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {isEditingAgent ? (
                              <div className="p-3 grid sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nom</label>
                                  <input autoFocus value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rôle</label>
                                  <input value={(editing as EditAgentState).role} onChange={(e) => setEditing({ ...editing, role: e.target.value } as EditAgentState)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20" placeholder="Ex : Technicien" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">E-mail de connexion</label>
                                  <input type="email" value={(editing as EditAgentState).email} onChange={(e) => setEditing({ ...editing, email: e.target.value } as EditAgentState)} className="w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-indigo-50/40" placeholder="email@mairie.fr" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Mot de passe</label>
                                  <input type="text" value={(editing as EditAgentState).password} onChange={(e) => setEditing({ ...editing, password: e.target.value } as EditAgentState)} className="w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-indigo-50/40" placeholder="Mot de passe" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Téléphone</label>
                                  <input type="tel" value={(editing as EditAgentState).phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value } as EditAgentState)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20" placeholder="06 12 34 56 78" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Service</label>
                                  <select value={(editing as EditAgentState).service_id} onChange={(e) => setEditing({ ...editing, service_id: e.target.value } as EditAgentState)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20">
                                    {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                  </select>
                                </div>
                                <div className="sm:col-span-2 flex gap-1.5 justify-end">
                                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200">Annuler</button>
                                  <button onClick={() => handleSaveAgent(agt.id)} className="px-3 py-1.5 bg-fresnes-500 text-white text-xs font-semibold rounded-lg hover:bg-fresnes-600">✓ Enregistrer</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-3 py-2.5">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
                                  <span className="text-slate-600 text-xs font-bold">{agt.nom.charAt(0).toUpperCase()}</span>
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-800">{agt.nom}</span>
                                    {agt.role && (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{agt.role}</span>
                                    )}
                                    {agt.email ? (
                                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                        Compte actif
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Sans accès portail</span>
                                    )}
                                  </div>
                                  {agt.email && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                      <span>📧 {agt.email}</span>
                                      {agt.phone && <span>· 📞 {agt.phone}</span>}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {agt.email && agt.password && (
                                    <button
                                      onClick={() => toggleCredentials(agt.id)}
                                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                                      title="Voir / copier les identifiants"
                                    >
                                      🔑 {showCreds ? "Masquer" : "Identifiants"}
                                    </button>
                                  )}
                                  <button onClick={() => setEditing({ type: "agent", id: agt.id, nom: agt.nom, email: agt.email ?? "", password: agt.password ?? "", phone: agt.phone ?? "", role: agt.role ?? "", service_id: agt.service_id })} className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md" title="Modifier">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteAgent(agt.id, agt.nom)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md" title="Supprimer">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Bloc identifiants (révélable) */}
                            {!isEditingAgent && showCreds && agt.email && agt.password && (
                              <div className="border-t border-indigo-100 bg-indigo-50/60 px-3 py-2.5 flex items-center gap-3 flex-wrap">
                                <div className="text-xs font-bold text-indigo-800">Portail agent :</div>
                                <code className="text-xs bg-white border border-indigo-200 px-2 py-1 rounded font-mono text-indigo-700">{agt.email}</code>
                                <code className="text-xs bg-white border border-indigo-200 px-2 py-1 rounded font-mono text-indigo-700">{agt.password}</code>
                                <a
                                  href="/agent"
                                  target="_blank"
                                  className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg"
                                >
                                  → Ouvrir /agent
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Routage des catégories ───────────────────────────────────── */}
        {services.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-blue-900" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Routage des catégories</h2>
                <p className="text-xs text-slate-400 mt-0.5">Quel service reçoit chaque type de demande du formulaire citoyen.</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {CATEGORIES.map((cat) => {
                const currentId = routing[cat] ?? "";
                const current   = services.find((s) => s.id === currentId);
                return (
                  <div key={cat} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0">{CATEGORY_ICONS[cat]}</div>
                    <span className="flex-1 text-sm font-medium text-slate-700">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-slate-300 text-xs hidden sm:block">→</span>
                    <select
                      value={currentId}
                      onChange={(e) => handleRoutingChange(cat, e.target.value)}
                      className={`w-48 border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 cursor-pointer ${current ? "border-slate-200 text-slate-800 bg-white" : "border-red-200 text-red-600 bg-red-50"}`}
                    >
                      {!current && <option value="">— Non assigné —</option>}
                      {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Les modifications s&apos;appliquent aux nouvelles demandes du formulaire citoyen.
              </p>
            </div>
          </div>
        )}

        {/* ── Info portail agent ───────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-indigo-500 text-lg mt-0.5 flex-shrink-0">👤</span>
          <div>
            <div className="text-xs font-bold text-indigo-900 mb-0.5">Portail agent individuel</div>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Chaque agent avec un <strong>e-mail + mot de passe</strong> peut se connecter sur{" "}
              <a href="/agent" target="_blank" className="underline font-semibold">/agent</a>{" "}
              pour accéder uniquement à <strong>ses propres demandes assignées</strong>, les traiter et ajouter des notes.
            </p>
          </div>
        </div>

        {DEMO_MODE && (
          <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-500 text-base mt-0.5 flex-shrink-0">ℹ️</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Mode démo :</strong> toutes les modifications sont sauvegardées localement.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
