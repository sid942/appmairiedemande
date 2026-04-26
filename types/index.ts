export type TicketType = "probleme" | "question" | "demande";
export type TicketStatus = "nouveau" | "en_cours" | "transmis" | "termine" | "ferme";
export type TicketCategory = "eclairage" | "voirie" | "dechets" | "espaces_verts" | "autre";
export type TicketPriority = "faible" | "normale" | "haute" | "urgente";

export interface Ticket {
  id: string;
  type: TicketType;
  categorie: TicketCategory;
  description: string;
  adresse: string;
  photo_url?: string;
  contact: string;
  nom?: string;
  statut: TicketStatus;
  priorite: TicketPriority;
  service_id?: string;
  service?: Service;
  agent_id?: string;
  agent?: Agent;
  citoyen_contacte?: boolean;
  transmis_prestataire?: boolean;
  /** Dispatch e-mail vers le service en charge */
  dispatched_at?: string;
  dispatched_to?: string[];
  dispatched_by?: string;
  dispatch_message?: string;
  /** Coordonnées GPS (optionnel — géocodage en prod, données demo en mode demo) */
  lat?: number;
  lng?: number;
  /** Demande archivée — masquée des vues par défaut, conservée à des fins d'historique. */
  archived?: boolean;
  archived_at?: string;
  /** Note de satisfaction laissée par le citoyen à la clôture (1–5). */
  rating?: number;
  rating_comment?: string;
  rating_at?: string;
  /** ─── Regroupement IA (Perplexity) ──────────────────────────────────────
   * Si défini, ce ticket est un signalement supplémentaire d'un ticket maître.
   * Les tickets-doublons sont masqués des vues par défaut. */
  duplicate_of?: string;
  /** Sur le ticket maître : nombre total de signalements (1 = original seul,
   * 2 = original + 1 duplicate, …) */
  duplicate_count?: number;
  /** Sur le ticket maître : IDs des signalements doublons rattachés. */
  duplicate_ids?: string[];
  /** Score de similarité (0-1) calculé par l'IA lors du rattachement. */
  duplicate_confidence?: number;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  nom: string;
  email: string;
  /** E-mails additionnels en copie lors d'un dispatch (CC) */
  cc_emails?: string[];
  /** Mot de passe (mode démo uniquement — en prod : auth Supabase) */
  password?: string;
}

export interface Agent {
  id: string;
  nom: string;
  service_id: string;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  type: "note" | "status_changed" | "service_changed" | "priority_changed" | "agent_changed" | "citoyen_contacte" | "transmis_prestataire" | "created" | "rated" | "dispatched" | "service_update" | "archived" | "unarchived" | "duplicate_linked";
  /** Auteur de l'événement : "admin" ou nom du service (si action côté service) */
  author?: string;
  contenu: string;
  created_at: string;
}

export interface RoutingRule {
  id: string;
  categorie: TicketCategory;
  service_id: string;
}

// ─── Labels ────────────────────────────────────────────────────────────────

export const TYPE_LABELS: Record<TicketType, string> = {
  probleme: "Signaler un problème",
  question: "Poser une question",
  demande: "Faire une demande",
};

export const TYPE_SHORT: Record<TicketType, string> = {
  probleme: "Problème",
  question: "Question",
  demande: "Demande",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  eclairage: "Éclairage public",
  voirie: "Voirie / route",
  dechets: "Déchets / propreté",
  espaces_verts: "Espaces verts",
  autre: "Autre",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  transmis: "Transmis",
  termine: "Terminé",
  ferme: "Fermé",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  faible: "Faible",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

// ─── Couleurs ───────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<TicketStatus, string> = {
  nouveau:  "bg-blue-100 text-blue-800",
  en_cours: "bg-amber-100 text-amber-800",
  transmis: "bg-violet-100 text-violet-800",
  termine:  "bg-emerald-100 text-emerald-800",
  ferme:    "bg-slate-100 text-slate-600",
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgente: "bg-red-100 text-red-700 border border-red-200",
  haute:   "bg-orange-100 text-orange-700 border border-orange-200",
  normale: "bg-blue-50 text-blue-700 border border-blue-100",
  faible:  "bg-slate-100 text-slate-500 border border-slate-200",
};

export const PRIORITY_DOT: Record<TicketPriority, string> = {
  urgente: "bg-red-500",
  haute:   "bg-orange-400",
  normale: "bg-blue-400",
  faible:  "bg-slate-300",
};

// ─── Icônes ────────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<TicketCategory, string> = {
  eclairage:     "💡",
  voirie:        "🚧",
  dechets:       "♻️",
  espaces_verts: "🌿",
  autre:         "📋",
};

export const TYPE_ICONS: Record<TicketType, string> = {
  probleme: "⚠️",
  question: "💬",
  demande:  "📋",
};

// ─── Priorité par défaut selon catégorie ───────────────────────────────────

export const DEFAULT_PRIORITY: Record<TicketCategory, TicketPriority> = {
  eclairage:     "normale",
  voirie:        "haute",
  dechets:       "normale",
  espaces_verts: "faible",
  autre:         "faible",
};

// ─── Délai max avant retard (jours) par statut ─────────────────────────────

export const OVERDUE_THRESHOLD: Partial<Record<TicketStatus, number>> = {
  nouveau:  3,
  en_cours: 7,
  transmis: 5,
};

export function getDaysOld(created_at: string): number {
  return Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000);
}

export function isOverdue(ticket: Ticket): boolean {
  const threshold = OVERDUE_THRESHOLD[ticket.statut];
  if (threshold === undefined) return false;
  return getDaysOld(ticket.created_at) > threshold;
}

export function getAgeLabel(created_at: string): string {
  const days = getDaysOld(created_at);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `${days}j`;
}
