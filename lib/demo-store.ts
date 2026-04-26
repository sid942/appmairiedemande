import {
  Ticket, Service, Agent, TicketNote,
  TicketType, TicketCategory, TicketStatus, TicketPriority,
  DEFAULT_PRIORITY,
} from "@/types";
import { geocodeAddress } from "./geocode";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const KEYS = {
  tickets:  "dm_tickets",
  notes:    "dm_notes",
  services: "dm_services",
  agents:   "dm_agents",
  routing:  "dm_routing",
  session:  "dm_service_session",
};

// ─── Données de référence (seed) ──────────────────────────────────────────

const SEED_SERVICES: Service[] = [
  { id: "svc-1", nom: "Service Technique",   email: "technique@mairie.fr",   password: "fresnes2026", cc_emails: ["technique-adjoint@mairie.fr"] },
  { id: "svc-2", nom: "Service Propreté",    email: "proprete@mairie.fr",    password: "fresnes2026" },
  { id: "svc-3", nom: "Service Voirie",      email: "voirie@mairie.fr",      password: "fresnes2026", cc_emails: ["voirie-chef@mairie.fr"] },
  { id: "svc-4", nom: "Espaces Verts",       email: "espacesverts@mairie.fr", password: "fresnes2026" },
  { id: "svc-5", nom: "Accueil Général",     email: "accueil@mairie.fr",     password: "fresnes2026" },
];

const SEED_AGENTS: Agent[] = [
  { id: "agt-1", nom: "Thomas Renard",   service_id: "svc-1" },
  { id: "agt-2", nom: "Claire Morin",    service_id: "svc-1" },
  { id: "agt-3", nom: "Marc Petit",      service_id: "svc-2" },
  { id: "agt-4", nom: "Sophie Lambert",  service_id: "svc-3" },
  { id: "agt-5", nom: "Paul Bernard",    service_id: "svc-3" },
  { id: "agt-6", nom: "Julie Fontaine",  service_id: "svc-4" },
  { id: "agt-7", nom: "Antoine Blanc",   service_id: "svc-5" },
];

const SEED_ROUTING: Record<TicketCategory, string> = {
  eclairage:     "svc-1",
  voirie:        "svc-3",
  dechets:       "svc-2",
  espaces_verts: "svc-4",
  autre:         "svc-5",
};

// ─── Centre de Fresnes (94260) ────────────────────────────────────────────
export const FRESNES_CENTER: [number, number] = [48.7558, 2.3222];

// ─── Utilitaires ──────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

/** Coordonnée aléatoire dans un rayon ~800m autour du centre de Fresnes */
export function randomFresnesCoord(): { lat: number; lng: number } {
  return {
    lat: FRESNES_CENTER[0] + (Math.random() - 0.5) * 0.014,
    lng: FRESNES_CENTER[1] + (Math.random() - 0.5) * 0.018,
  };
}

// ─── Services (lecture + CRUD) ────────────────────────────────────────────

export function demoGetServices(): Service[] {
  if (typeof window === "undefined") return SEED_SERVICES;
  const raw = localStorage.getItem(KEYS.services);
  return raw ? JSON.parse(raw) : SEED_SERVICES;
}

export function demoCreateService(
  nom: string,
  email: string,
  password?: string,
  cc_emails?: string[],
): Service {
  const services = demoGetServices();
  const service: Service = {
    id: "svc-" + genId(),
    nom: nom.trim(),
    email: email.trim(),
    password: password?.trim() || undefined,
    cc_emails: cc_emails?.map((e) => e.trim()).filter(Boolean),
  };
  localStorage.setItem(KEYS.services, JSON.stringify([...services, service]));
  return service;
}

export function demoUpdateService(id: string, patch: Partial<Omit<Service, "id">>): Service | null {
  const services = demoGetServices();
  const idx = services.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  services[idx] = { ...services[idx], ...patch };
  localStorage.setItem(KEYS.services, JSON.stringify(services));
  return services[idx];
}

export function demoDeleteService(id: string): void {
  const services = demoGetServices().filter((s) => s.id !== id);
  localStorage.setItem(KEYS.services, JSON.stringify(services));
  // Supprimer les agents du service
  const agents = demoGetAgents().filter((a) => a.service_id !== id);
  localStorage.setItem(KEYS.agents, JSON.stringify(agents));
  // Réaffecter les règles de routage qui pointaient vers ce service
  const routing = demoGetRouting();
  const fallback = services[0]?.id ?? "";
  let changed = false;
  for (const cat of Object.keys(routing) as TicketCategory[]) {
    if (routing[cat] === id) {
      routing[cat] = fallback;
      changed = true;
    }
  }
  if (changed) localStorage.setItem(KEYS.routing, JSON.stringify(routing));
}

// ─── Agents (lecture + CRUD) ──────────────────────────────────────────────

export function demoGetAgents(serviceId?: string): Agent[] {
  if (typeof window === "undefined") {
    return serviceId ? SEED_AGENTS.filter((a) => a.service_id === serviceId) : SEED_AGENTS;
  }
  const raw = localStorage.getItem(KEYS.agents);
  const agents: Agent[] = raw ? JSON.parse(raw) : SEED_AGENTS;
  return serviceId ? agents.filter((a) => a.service_id === serviceId) : agents;
}

export function demoCreateAgent(nom: string, service_id: string): Agent {
  const agents = demoGetAgents();
  const agent: Agent = { id: "agt-" + genId(), nom: nom.trim(), service_id };
  localStorage.setItem(KEYS.agents, JSON.stringify([...agents, agent]));
  return agent;
}

export function demoUpdateAgent(id: string, patch: Partial<Omit<Agent, "id">>): Agent | null {
  const agents = demoGetAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  agents[idx] = { ...agents[idx], ...patch };
  localStorage.setItem(KEYS.agents, JSON.stringify(agents));
  return agents[idx];
}

export function demoDeleteAgent(id: string): void {
  const agents = demoGetAgents().filter((a) => a.id !== id);
  localStorage.setItem(KEYS.agents, JSON.stringify(agents));
}

// ─── Routage (lecture + mise à jour) ─────────────────────────────────────

export function demoGetRouting(): Record<TicketCategory, string> {
  if (typeof window === "undefined") return { ...SEED_ROUTING };
  const raw = localStorage.getItem(KEYS.routing);
  return raw ? JSON.parse(raw) : { ...SEED_ROUTING };
}

export function demoUpdateRouting(categorie: TicketCategory, service_id: string): void {
  const routing = demoGetRouting();
  routing[categorie] = service_id;
  localStorage.setItem(KEYS.routing, JSON.stringify(routing));
}

// ─── Tickets ──────────────────────────────────────────────────────────────

function hydrate(tickets: Ticket[]): Ticket[] {
  const services = demoGetServices();
  const agents   = demoGetAgents();
  return tickets.map((t) => ({
    ...t,
    service: services.find((s) => s.id === t.service_id),
    agent:   agents.find((a) => a.id === t.agent_id),
  }));
}

function persist(tickets: Ticket[]) {
  const lean = tickets.map(({ service: _s, agent: _a, ...rest }) => rest);
  localStorage.setItem(KEYS.tickets, JSON.stringify(lean));
}

export function demoGetTickets(
  statut?: string,
  serviceId?: string,
  priorite?: string,
  search?: string,
  options?: { includeArchived?: boolean; onlyArchived?: boolean; includeDuplicates?: boolean },
): Ticket[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.tickets);
  let tickets: Ticket[] = hydrate(raw ? JSON.parse(raw) : getSeedTickets());
  if (!raw) persist(tickets);

  // Masquer les doublons (re-signalements rattachés à un maître) sauf demande explicite.
  if (!options?.includeDuplicates) {
    tickets = tickets.filter((t) => !t.duplicate_of);
  }

  if (options?.onlyArchived) {
    tickets = tickets.filter((t) => t.archived);
  } else if (!options?.includeArchived) {
    tickets = tickets.filter((t) => !t.archived);
  }

  if (statut)    tickets = tickets.filter((t) => t.statut === statut);
  if (serviceId) tickets = tickets.filter((t) => t.service_id === serviceId);
  if (priorite)  tickets = tickets.filter((t) => t.priorite === priorite);
  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.adresse.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }
  return tickets.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** Retourne les signalements doublons rattachés à un ticket maître. */
export function demoGetDuplicates(masterId: string): Ticket[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  return hydrate(tickets.filter((t) => t.duplicate_of === masterId)).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function demoGetTicket(id: string): Ticket | null {
  return demoGetTickets().find((t) => t.id === id) ?? null;
}

export interface CreateTicketResult {
  ticket: Ticket;
  /** Si défini : la demande a été reconnue comme un re-signalement. */
  linkedTo?: { masterId: string; signalNumber: number; reasoning: string };
}

export async function demoCreateTicket(data: {
  type: TicketType;
  categorie: TicketCategory;
  description: string;
  adresse: string;
  photo_url?: string;
  contact: string;
  nom?: string;
}): Promise<Ticket> {
  const result = await demoCreateTicketWithDedup(data);
  return result.ticket;
}

/**
 * Création complète : géocodage + détection de doublons via Perplexity.
 * Si la nouvelle demande matche une demande existante (même catégorie, ouverte),
 * elle est créée mais marquée `duplicate_of`, et le ticket maître voit son
 * compteur incrémenté.
 */
export async function demoCreateTicketWithDedup(data: {
  type: TicketType;
  categorie: TicketCategory;
  description: string;
  adresse: string;
  photo_url?: string;
  contact: string;
  nom?: string;
}): Promise<CreateTicketResult> {
  const routing   = demoGetRouting();
  const services  = demoGetServices();
  const serviceId = routing[data.categorie];

  // ── 1. Géocodage ─────────────────────────────────────────────────────
  let lat: number;
  let lng: number;
  const geo = await geocodeAddress(data.adresse);
  if (geo) {
    lat = geo.lat;
    lng = geo.lng;
  } else {
    const fallback = randomFresnesCoord();
    lat = fallback.lat;
    lng = fallback.lng;
  }

  // ── 2. Détection de doublons via Perplexity ──────────────────────────
  // On compare aux tickets ouverts de la même catégorie (hors archivés/clos).
  const candidates = demoGetTickets(undefined, undefined, undefined, undefined, {})
    .filter(
      (t) =>
        t.categorie === data.categorie &&
        t.statut !== "termine" &&
        t.statut !== "ferme" &&
        !t.archived,
    )
    .slice(0, 12) // garde-fou : pas plus de 12 candidats envoyés à l'IA
    .map((t) => ({
      id: t.id,
      description: t.description,
      adresse: t.adresse,
      created_at: t.created_at,
    }));

  let dedup: { matchId: string | null; confidence: number; reasoning: string } = {
    matchId: null,
    confidence: 0,
    reasoning: "",
  };
  if (candidates.length > 0) {
    try {
      const r = await fetch("/api/similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.description,
          adresse: data.adresse,
          categorie: data.categorie,
          candidates,
        }),
      });
      if (r.ok) dedup = await r.json();
    } catch (e) {
      console.warn("[demoCreateTicket] similarity check failed:", e);
    }
  }

  const ticket: Ticket = {
    id: genId(),
    ...data,
    priorite:   DEFAULT_PRIORITY[data.categorie],
    statut:     "nouveau",
    service_id: serviceId,
    service:    services.find((s) => s.id === serviceId),
    lat,
    lng,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    duplicate_of:        dedup.matchId ?? undefined,
    duplicate_confidence: dedup.matchId ? dedup.confidence : undefined,
  };

  // ── 3. Persistance + mise à jour éventuelle du maître ────────────────
  const raw = localStorage.getItem(KEYS.tickets);
  const allRaw: Ticket[] = raw ? JSON.parse(raw) : [];
  let signalNumber = 1;
  let linkedTo: CreateTicketResult["linkedTo"];

  if (dedup.matchId) {
    const idx = allRaw.findIndex((t) => t.id === dedup.matchId);
    if (idx !== -1) {
      const master = allRaw[idx];
      const prevCount = master.duplicate_count ?? 1; // l'original compte pour 1
      const newCount  = prevCount + 1;
      signalNumber = newCount;
      allRaw[idx] = {
        ...master,
        duplicate_count: newCount,
        duplicate_ids: [...(master.duplicate_ids ?? []), ticket.id],
        updated_at: new Date().toISOString(),
      };
      linkedTo = { masterId: master.id, signalNumber: newCount, reasoning: dedup.reasoning };
    }
  }

  persist([ticket, ...allRaw]);

  // ── 4. Notes d'historique ────────────────────────────────────────────
  addNote(ticket.id, "created", "Demande créée par le citoyen");
  if (linkedTo) {
    addNote(
      ticket.id,
      "duplicate_linked",
      `Rattachée automatiquement (IA) à la demande #${linkedTo.masterId.slice(0, 8).toUpperCase()} — ${linkedTo.reasoning}`,
    );
    addNote(
      linkedTo.masterId,
      "duplicate_linked",
      `${linkedTo.signalNumber}ème signalement rattaché — « ${data.description.slice(0, 100)}${data.description.length > 100 ? "…" : ""} »`,
    );
  }

  return { ticket: hydrate([ticket])[0], linkedTo };
}

export function demoUpdateTicket(
  id: string,
  patch: {
    statut?: TicketStatus;
    priorite?: TicketPriority;
    service_id?: string;
    agent_id?: string;
    citoyen_contacte?: boolean;
    transmis_prestataire?: boolean;
  },
): Ticket | null {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const prev = tickets[idx];

  if (patch.statut && patch.statut !== prev.statut) {
    addNote(id, "status_changed", `Statut changé : ${prev.statut} → ${patch.statut}`);
  }
  if (patch.priorite && patch.priorite !== prev.priorite) {
    addNote(id, "priority_changed", `Priorité changée : ${prev.priorite} → ${patch.priorite}`);
  }
  if (patch.service_id && patch.service_id !== prev.service_id) {
    const svcName = demoGetServices().find((s) => s.id === patch.service_id)?.nom ?? patch.service_id;
    addNote(id, "service_changed", `Service assigné : ${svcName}`);
  }
  if (patch.agent_id && patch.agent_id !== prev.agent_id) {
    const agentName = demoGetAgents().find((a) => a.id === patch.agent_id)?.nom ?? patch.agent_id;
    addNote(id, "agent_changed", `Agent assigné : ${agentName}`);
  }
  if (patch.citoyen_contacte) {
    addNote(id, "citoyen_contacte", "Citoyen contacté");
  }
  if (patch.transmis_prestataire) {
    addNote(id, "transmis_prestataire", "Transmis à un prestataire");
  }

  tickets[idx] = { ...prev, ...patch, updated_at: new Date().toISOString() };
  persist(tickets);
  return hydrate([tickets[idx]])[0];
}

// ─── Archive / suppression ────────────────────────────────────────────────

export function demoArchiveTicket(id: string): Ticket | null {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tickets[idx] = {
    ...tickets[idx],
    archived: true,
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  persist(tickets);
  addNote(id, "archived", "Demande archivée", "admin");
  return hydrate([tickets[idx]])[0];
}

export function demoUnarchiveTicket(id: string): Ticket | null {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tickets[idx] = {
    ...tickets[idx],
    archived: false,
    archived_at: undefined,
    updated_at: new Date().toISOString(),
  };
  persist(tickets);
  addNote(id, "unarchived", "Demande désarchivée", "admin");
  return hydrate([tickets[idx]])[0];
}

export function demoDeleteTicket(id: string): boolean {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const before = tickets.length;
  const filtered = tickets.filter((t) => t.id !== id);
  if (filtered.length === before) return false;
  persist(filtered);
  // Supprimer aussi les notes associées
  const rawNotes = localStorage.getItem(KEYS.notes);
  if (rawNotes) {
    const notes: TicketNote[] = JSON.parse(rawNotes);
    localStorage.setItem(KEYS.notes, JSON.stringify(notes.filter((n) => n.ticket_id !== id)));
  }
  return true;
}

// ─── Citoyens (agrégation) ────────────────────────────────────────────────

export interface CitizenSummary {
  contact: string;
  nom?: string;
  total: number;
  active: number;       // statut !== termine && !== ferme
  resolved: number;     // termine
  last_at: string;      // ISO
  last_id: string;
  categories: string[]; // catégories distinctes
  avg_rating?: number;
}

export function demoGetCitizens(): CitizenSummary[] {
  const all = demoGetTickets(undefined, undefined, undefined, undefined, { includeArchived: true });
  const map = new Map<string, CitizenSummary & { ratings: number[] }>();
  for (const t of all) {
    const key = t.contact.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        contact: t.contact,
        nom: t.nom,
        total: 0, active: 0, resolved: 0,
        last_at: t.created_at,
        last_id: t.id,
        categories: [],
        ratings: [],
      });
    }
    const c = map.get(key)!;
    c.total++;
    if (t.statut === "termine") c.resolved++;
    else if (t.statut !== "ferme") c.active++;
    if (new Date(t.created_at).getTime() > new Date(c.last_at).getTime()) {
      c.last_at = t.created_at;
      c.last_id = t.id;
    }
    if (t.nom && !c.nom) c.nom = t.nom;
    if (!c.categories.includes(t.categorie)) c.categories.push(t.categorie);
    if (typeof t.rating === "number") c.ratings.push(t.rating);
  }
  const out: CitizenSummary[] = [];
  for (const [, c] of map) {
    const { ratings, ...rest } = c;
    out.push({
      ...rest,
      avg_rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined,
    });
  }
  return out.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
}

// ─── Notes / historique ───────────────────────────────────────────────────

function addNote(
  ticketId: string,
  type: TicketNote["type"],
  contenu: string,
  author?: string,
) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEYS.notes);
  const notes: TicketNote[] = raw ? JSON.parse(raw) : [];
  notes.unshift({
    id:         genId(),
    ticket_id:  ticketId,
    type,
    contenu,
    author,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(KEYS.notes, JSON.stringify(notes));
}

export function demoGetNotes(ticketId: string): TicketNote[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.notes);
  const notes: TicketNote[] = raw ? JSON.parse(raw) : [];
  return notes
    .filter((n) => n.ticket_id === ticketId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function demoAddNote(ticketId: string, contenu: string) {
  addNote(ticketId, "note", contenu);
}

// ─── Note de satisfaction citoyen ─────────────────────────────────────────

export function demoRateTicket(
  ticketId: string,
  rating: number,
  comment?: string,
): Ticket | null {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;

  tickets[idx] = {
    ...tickets[idx],
    rating,
    rating_comment: comment?.trim() || undefined,
    rating_at: new Date().toISOString(),
  };
  persist(tickets);
  addNote(
    ticketId,
    "rated",
    `Citoyen a noté la résolution : ${rating}/5${comment?.trim() ? ` — « ${comment.trim()} »` : ""}`,
  );
  return hydrate([tickets[idx]])[0];
}

// ─── Auth Service (mode démo) ─────────────────────────────────────────────

export interface ServiceSession {
  service_id: string;
  service_nom: string;
  email: string;
  logged_at: string;
}

export function demoServiceLogin(email: string, password: string): ServiceSession | null {
  const services = demoGetServices();
  const svc = services.find(
    (s) => s.email.toLowerCase().trim() === email.toLowerCase().trim() && s.password === password,
  );
  if (!svc) return null;
  const session: ServiceSession = {
    service_id: svc.id,
    service_nom: svc.nom,
    email: svc.email,
    logged_at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.session, JSON.stringify(session));
  }
  return session;
}

export function demoGetServiceSession(): ServiceSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.session);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function demoServiceLogout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.session);
}

// ─── Dispatch e-mail (admin → service) ────────────────────────────────────

export interface DispatchResult {
  ticket: Ticket;
  emails: string[];
  ok: boolean;
  error?: string;
}

/**
 * Marque un ticket comme transmis à un ou plusieurs e-mails du service en charge.
 * Met à jour le statut → "transmis", ajoute une note d'historique et appelle
 * /api/dispatch pour envoyer les e-mails (Resend en prod, mock en démo).
 */
export async function demoDispatchTicket(
  ticketId: string,
  emails: string[],
  message?: string,
): Promise<DispatchResult> {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) {
    return { ticket: null as unknown as Ticket, emails, ok: false, error: "Ticket introuvable" };
  }
  const cleanEmails = emails.map((e) => e.trim()).filter(Boolean);
  const now = new Date().toISOString();

  tickets[idx] = {
    ...tickets[idx],
    statut: "transmis",
    dispatched_at: now,
    dispatched_to: cleanEmails,
    dispatched_by: "admin",
    dispatch_message: message?.trim() || undefined,
    updated_at: now,
  };
  persist(tickets);

  // Note historique côté admin
  const svcName =
    demoGetServices().find((s) => s.id === tickets[idx].service_id)?.nom ?? "service";
  addNote(
    ticketId,
    "dispatched",
    `Demande transmise au ${svcName} par e-mail (${cleanEmails.join(", ")})${message?.trim() ? ` — « ${message.trim()} »` : ""}`,
    "admin",
  );
  if (tickets[idx].statut !== "transmis") {
    addNote(ticketId, "status_changed", "Statut changé → transmis", "admin");
  }

  // Appel API e-mail
  let ok = true;
  let error: string | undefined;
  try {
    const ticketHydrated = hydrate([tickets[idx]])[0];
    const res = await fetch("/api/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: ticketHydrated, emails: cleanEmails, message }),
    });
    const json = await res.json();
    ok = !!json.ok;
    error = json.error;
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : "Erreur réseau";
  }

  return { ticket: hydrate([tickets[idx]])[0], emails: cleanEmails, ok, error };
}

// ─── Service-side update (le service fait évoluer son ticket) ─────────────

export function demoServiceUpdateTicket(
  ticketId: string,
  patch: { statut?: TicketStatus; note?: string },
  authorServiceName: string,
): Ticket | null {
  const raw = localStorage.getItem(KEYS.tickets);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;

  const prev = tickets[idx];
  const now = new Date().toISOString();

  if (patch.statut && patch.statut !== prev.statut) {
    tickets[idx] = { ...prev, statut: patch.statut, updated_at: now };
    persist(tickets);
    addNote(
      ticketId,
      "service_update",
      `Statut mis à jour par le service : ${prev.statut} → ${patch.statut}`,
      authorServiceName,
    );
  }
  if (patch.note?.trim()) {
    addNote(ticketId, "service_update", patch.note.trim(), authorServiceName);
  }
  return hydrate([tickets[idx]])[0];
}

// ─── Données de démo (seed) ───────────────────────────────────────────────

function getSeedTickets(): Ticket[] {
  const seeds: Omit<Ticket, "service" | "agent">[] = [
    {
      id: genId(), type: "probleme", categorie: "voirie",
      description: "Nid de poule dangereux avenue du Général de Gaulle, profondeur estimée 15 cm. Plusieurs cyclistes ont failli tomber.",
      adresse: "Avenue du Général de Gaulle, face au n°34",
      contact: "marie.martin@email.fr", nom: "Marie Martin",
      statut: "nouveau", priorite: "urgente",
      service_id: "svc-3", agent_id: "agt-4",
      lat: 48.7562, lng: 2.3208,
      created_at: daysAgo(5), updated_at: daysAgo(5),
    },
    {
      id: genId(), type: "probleme", categorie: "eclairage",
      description: "Lampadaire éteint depuis 3 jours au coin de la rue de la République et rue des Lilas. Zone très sombre la nuit.",
      adresse: "Rue de la République / Rue des Lilas",
      contact: "jean.dupont@email.fr", nom: "Jean Dupont",
      statut: "en_cours", priorite: "haute",
      service_id: "svc-1", agent_id: "agt-1",
      lat: 48.7582, lng: 2.3183,
      created_at: daysAgo(4), updated_at: daysAgo(2),
    },
    {
      id: genId(), type: "demande", categorie: "dechets",
      description: "Notre résidence de 24 logements n'a plus assez de bacs de tri. Nous sollicitons 2 conteneurs supplémentaires.",
      adresse: "8 allée des Roses, Résidence Les Charmes",
      contact: "syndic@charmes.fr", nom: "Syndic Résidence Les Charmes",
      statut: "transmis", priorite: "normale",
      service_id: "svc-2", agent_id: "agt-3",
      lat: 48.7594, lng: 2.3175,
      created_at: daysAgo(3), updated_at: daysAgo(1),
    },
    {
      id: genId(), type: "question", categorie: "espaces_verts",
      description: "Le square Pasteur n'a pas été tondu depuis plus de 3 semaines. L'herbe dépasse 30cm, c'est impraticable pour les enfants.",
      adresse: "Square Pasteur, entrée rue Voltaire",
      contact: "habitant.quartier@mail.fr",
      statut: "nouveau", priorite: "normale",
      service_id: "svc-4",
      lat: 48.7568, lng: 2.3237,
      created_at: daysAgo(2), updated_at: daysAgo(2),
    },
    {
      id: genId(), type: "probleme", categorie: "dechets",
      description: "Dépôt sauvage de déchets volumineux (canapé, matelas) rue du Moulin. Ça dure depuis une semaine.",
      adresse: "Rue du Moulin, entre le n°12 et n°18",
      contact: "0612345678",
      statut: "nouveau", priorite: "haute",
      service_id: "svc-2",
      lat: 48.7508, lng: 2.3252,
      created_at: daysAgo(7), updated_at: daysAgo(7),
    },
    {
      id: genId(), type: "demande", categorie: "autre",
      description: "Réservation de la salle des fêtes pour notre repas de quartier annuel le 15 juin, environ 80 personnes.",
      adresse: "Salle des fêtes, Place de la Liberté",
      contact: "association.quartier@gmail.com", nom: "Association du Quartier Nord",
      statut: "en_cours", priorite: "faible",
      service_id: "svc-5", agent_id: "agt-7",
      lat: 48.7553, lng: 2.3218,
      created_at: daysAgo(1), updated_at: hoursAgo(3),
    },
    {
      id: genId(), type: "probleme", categorie: "voirie",
      description: "Trottoir effondré devant l'école primaire Jules Ferry. Danger immédiat pour les enfants.",
      adresse: "Rue Jules Ferry, devant l'école primaire",
      contact: "directrice.ferry@academie.fr", nom: "Direction École Jules Ferry",
      statut: "en_cours", priorite: "urgente",
      service_id: "svc-3", agent_id: "agt-5",
      lat: 48.7543, lng: 2.3205,
      created_at: hoursAgo(6), updated_at: hoursAgo(2),
    },
    {
      id: genId(), type: "question", categorie: "autre",
      description: "Quels sont les horaires d'ouverture de la déchetterie municipale pendant les vacances de Pâques ?",
      adresse: "Déchetterie Municipale, Route de Lyon",
      contact: "citoyen@email.fr",
      statut: "termine", priorite: "faible",
      service_id: "svc-5", agent_id: "agt-7",
      lat: 48.7495, lng: 2.3188,
      created_at: daysAgo(6), updated_at: daysAgo(1),
    },
    {
      id: genId(), type: "demande", categorie: "espaces_verts",
      description: "Demande d'élagage de l'arbre face au 24 rue des Platanes. Les branches menacent la toiture.",
      adresse: "24 rue des Platanes",
      contact: "proprietaire@mail.fr", nom: "M. Leclerc",
      statut: "transmis", priorite: "haute",
      service_id: "svc-4", agent_id: "agt-6",
      lat: 48.7576, lng: 2.3248,
      created_at: daysAgo(2), updated_at: hoursAgo(8),
    },
  ];

  // Injecter quelques notes de démo
  setTimeout(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEYS.notes)) return;
    const tickets = hydrate(seeds as Ticket[]);
    tickets.slice(0, 3).forEach((t) => {
      addNote(t.id, "created", "Demande créée par le citoyen");
    });
    addNote(seeds[1].id, "status_changed", "Statut changé : nouveau → en_cours");
    addNote(seeds[1].id, "agent_changed", "Agent assigné : Thomas Renard");
    addNote(seeds[2].id, "status_changed", "Statut changé : nouveau → en_cours");
    addNote(seeds[2].id, "status_changed", "Statut changé : en_cours → transmis");
    addNote(seeds[2].id, "citoyen_contacte", "Citoyen contacté");
  }, 0);

  return hydrate(seeds as Ticket[]);
}
