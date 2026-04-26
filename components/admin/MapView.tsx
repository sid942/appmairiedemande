"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useRouter } from "next/navigation";
// leaflet.heat importé dynamiquement dans HeatLayer (client-only)
// leaflet/dist/leaflet.css est importé dans app/layout.tsx
import {
  Ticket,
  Service,
  STATUS_LABELS,
  PRIORITY_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TYPE_SHORT,
  isOverdue,
} from "@/types";
import {
  DEMO_MODE,
  demoGetTickets,
  demoGetServices,
  FRESNES_CENTER,
} from "@/lib/demo-store";

// ─── Constantes ───────────────────────────────────────────────────────────

const MAP_CENTER: [number, number] = FRESNES_CENTER;
const MAP_ZOOM = 14;

// Tuiles Carto (épurées, sans surcharge)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

// ─── Couleurs des tickets ─────────────────────────────────────────────────

interface ColorSpec {
  fill: string;
  border: string;
  label: string;
  legendKey: string;
}

function getTicketColor(t: Ticket): ColorSpec {
  if (t.statut === "termine" || t.statut === "ferme")
    return { fill: "#10b981", border: "#059669", label: "Terminé", legendKey: "termine" };
  if (t.priorite === "urgente")
    return { fill: "#ef4444", border: "#dc2626", label: "Urgente", legendKey: "urgente" };
  if (isOverdue(t))
    return { fill: "#f97316", border: "#ea580c", label: "En retard", legendKey: "retard" };
  if (t.priorite === "haute")
    return { fill: "#f59e0b", border: "#d97706", label: "Haute priorité", legendKey: "haute" };
  if (t.statut === "en_cours")
    return { fill: "#3b82f6", border: "#2563eb", label: "En cours", legendKey: "en_cours" };
  return { fill: "#6366f1", border: "#4f46e5", label: "Nouveau", legendKey: "nouveau" };
}

function getHeatWeight(t: Ticket): number {
  if (t.priorite === "urgente") return 1.0;
  if (isOverdue(t))             return 0.85;
  if (t.priorite === "haute")   return 0.7;
  if (t.statut === "en_cours")  return 0.5;
  if (t.statut === "termine" || t.statut === "ferme") return 0.2;
  return 0.4;
}

// ─── Heatmap layer (canvas, via leaflet.heat chargé dynamiquement) ────────

function HeatLayer({ tickets }: { tickets: Ticket[] }) {
  const map = useMap();

  useEffect(() => {
    let heatLayer: L.Layer | null = null;
    let cancelled = false;

    (async () => {
      try {
        // Import dynamique : garantit l'exécution côté client uniquement
        await import("leaflet.heat");
        if (cancelled) return;

        // Vérifie que le plugin s'est bien attaché à L
        const heatFn = (L as unknown as {
          heatLayer?: (
            points: [number, number, number?][],
            options?: Record<string, unknown>,
          ) => L.Layer;
        }).heatLayer;

        if (typeof heatFn !== "function") {
          console.error("[HeatLayer] leaflet.heat n'a pas pu s'attacher à L");
          return;
        }

        const points: [number, number, number][] = tickets
          .filter((t) => t.lat != null && t.lng != null)
          .map((t) => [t.lat!, t.lng!, getHeatWeight(t)]);

        if (points.length === 0) return;

        heatLayer = heatFn(points, {
          radius: 45,
          blur: 28,
          maxZoom: 17,
          minOpacity: 0.35,
          max: 1.0,
          gradient: {
            0.2: "#3b82f6",
            0.45: "#22d3ee",
            0.6: "#f59e0b",
            0.8: "#f97316",
            1.0: "#ef4444",
          },
        });
        heatLayer.addTo(map);
      } catch (err) {
        console.error("[HeatLayer] Échec chargement leaflet.heat :", err);
      }
    })();

    return () => {
      cancelled = true;
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [map, tickets]);

  return null;
}

// ─── Tooltip enrichi (contenu HTML affiché au survol) ─────────────────────

function TicketTooltip({ ticket }: { ticket: Ticket }) {
  const col = getTicketColor(ticket);
  const overdue = isOverdue(ticket);
  const daysOld = Math.floor(
    (Date.now() - new Date(ticket.created_at).getTime()) / 86400000,
  );

  return (
    <div className="min-w-[220px] max-w-[280px] space-y-1.5">
      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ background: col.fill }}
        >
          {col.label}
        </span>
        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
          {TYPE_SHORT[ticket.type]}
        </span>
        {overdue && (
          <span className="text-[10px] font-semibold text-orange-300">
            ⏰ Retard
          </span>
        )}
      </div>

      {/* Catégorie */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
        <span>{CATEGORY_ICONS[ticket.categorie]}</span>
        <span className="font-semibold">{CATEGORY_LABELS[ticket.categorie]}</span>
      </div>

      {/* Adresse */}
      <div className="text-[11px] text-white leading-snug font-medium">
        📍 {ticket.adresse}
      </div>

      {/* Description (tronquée) */}
      <div className="text-[11px] text-slate-300 leading-snug">
        {ticket.description.length > 110
          ? ticket.description.slice(0, 110) + "…"
          : ticket.description}
      </div>

      {/* Footer : statut + âge + service */}
      <div className="pt-1 mt-1 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] text-slate-300">
        <span>
          {STATUS_LABELS[ticket.statut]} · {PRIORITY_LABELS[ticket.priorite]}
        </span>
        <span className="text-slate-400">
          {daysOld === 0 ? "auj." : `${daysOld}j`}
        </span>
      </div>

      {/* Service */}
      {ticket.service && (
        <div className="text-[10px] text-slate-400">
          ▸ {ticket.service.nom}
        </div>
      )}

      {/* Hint clic */}
      <div className="pt-1 mt-1 border-t border-white/10 text-[10px] text-blue-300 font-semibold">
        Cliquer pour ouvrir la demande →
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function MapView() {
  const router = useRouter();

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loaded,   setLoaded]   = useState(false);

  // Filtres
  const [filterService, setFilterService] = useState("");
  const [filterStatut,  setFilterStatut]  = useState("");
  const [filterPeriode, setFilterPeriode] = useState("30");

  // Mode vue
  const [mode, setMode] = useState<"points" | "heat">("points");

  // Ouvrir la fiche complète au clic sur un point
  function openTicket(id: string) {
    router.push(`/admin/tickets/${id}`);
  }

  // Charger données
  useEffect(() => {
    if (DEMO_MODE) {
      setTickets(demoGetTickets());
      setServices(demoGetServices());
    }
    setLoaded(true);
  }, []);

  // Filtrer
  const filtered = useMemo(() => {
    let t = tickets.filter((x) => x.lat != null && x.lng != null);
    if (filterService) t = t.filter((x) => x.service_id === filterService);
    if (filterStatut)  t = t.filter((x) => x.statut === filterStatut);
    if (filterPeriode !== "all") {
      const cutoff = Date.now() - parseInt(filterPeriode) * 86400000;
      t = t.filter((x) => new Date(x.created_at).getTime() > cutoff);
    }
    return t;
  }, [tickets, filterService, filterStatut, filterPeriode]);

  // Stats rapides
  const stats = useMemo(() => ({
    urgents:  filtered.filter((t) => t.priorite === "urgente").length,
    retard:   filtered.filter((t) => isOverdue(t) && t.priorite !== "urgente").length,
    termines: filtered.filter((t) => t.statut === "termine" || t.statut === "ferme").length,
  }), [filtered]);

  function resetFilters() {
    setFilterService("");
    setFilterStatut("");
    setFilterPeriode("30");
  }

  const hasFilters = filterService || filterStatut || filterPeriode !== "30";

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Chargement de la carte…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 113px)" }}>

      {/* ── Barre de filtres ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 flex-shrink-0">

        {/* Service */}
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 bg-white cursor-pointer"
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.nom}</option>
          ))}
        </select>

        {/* Statut */}
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 bg-white cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="nouveau">Nouveau</option>
          <option value="en_cours">En cours</option>
          <option value="transmis">Transmis</option>
          <option value="termine">Terminé</option>
          <option value="ferme">Fermé</option>
        </select>

        {/* Période */}
        <select
          value={filterPeriode}
          onChange={(e) => setFilterPeriode(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 bg-white cursor-pointer"
        >
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
          <option value="all">Toute la période</option>
        </select>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Réinitialiser
          </button>
        )}

        <div className="flex-1" />

        {/* Compteur */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mr-2">
          <span className="font-semibold text-slate-700">{filtered.length}</span> demande{filtered.length !== 1 ? "s" : ""}
          {stats.urgents > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              {stats.urgents} urgente{stats.urgents > 1 ? "s" : ""}
            </span>
          )}
          {stats.retard > 0 && (
            <span className="flex items-center gap-1 text-orange-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              {stats.retard} en retard
            </span>
          )}
        </div>

        {/* Toggle mode */}
        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setMode("points")}
            title="Vue points"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "points"
                ? "bg-blue-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="4" />
            </svg>
            Points
          </button>
          <button
            onClick={() => setMode("heat")}
            title="Vue chaleur"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "heat"
                ? "bg-blue-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 6 7 6 11a4 4 0 008 0c0-4-4-9-4-9z" fill="currentColor" opacity=".6"/>
              <path d="M10 8c0 0-2 3-2 5a2 2 0 004 0c0-2-2-5-2-5z" fill="currentColor"/>
            </svg>
            Chaleur
          </button>
        </div>
      </div>

      {/* ── Zone carte + panel ───────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Tuiles */}
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />

          {/* ─ Mode Chaleur ─ */}
          {mode === "heat" && <HeatLayer tickets={filtered} />}

          {/* ─ Mode Points ─ */}
          {mode === "points" && filtered.map((t) => {
            const col = getTicketColor(t);
            return (
              <CircleMarker
                key={t.id}
                center={[t.lat!, t.lng!]}
                radius={8}
                pathOptions={{
                  fillColor: col.fill,
                  fillOpacity: 0.95,
                  color: col.border,
                  weight: 1.5,
                }}
                eventHandlers={{
                  click: () => openTicket(t.id),
                  mouseover: (e) => e.target.setStyle({ radius: 11, weight: 3 }),
                  mouseout:  (e) => e.target.setStyle({ radius: 8,  weight: 1.5 }),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -10]}
                  opacity={1}
                  className="!bg-slate-900 !text-white !border-0 !shadow-xl !rounded-lg !px-3 !py-2"
                >
                  <TicketTooltip ticket={t} />
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* En mode chaleur, petits points cliquables */}
          {mode === "heat" && filtered.map((t) => (
            <CircleMarker
              key={`dot-${t.id}`}
              center={[t.lat!, t.lng!]}
              radius={4}
              pathOptions={{
                fillColor: getTicketColor(t).fill,
                fillOpacity: 1,
                color: "#fff",
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => openTicket(t.id),
                mouseover: (e) => e.target.setStyle({ radius: 6, weight: 2 }),
                mouseout:  (e) => e.target.setStyle({ radius: 4, weight: 1.5 }),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
                className="!bg-slate-900 !text-white !border-0 !shadow-xl !rounded-lg !px-3 !py-2"
              >
                <TicketTooltip ticket={t} />
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* ── Attribution ───────────────────────────────────────────── */}
        <div className="absolute bottom-1 right-2 text-[10px] text-slate-400 z-[1000] pointer-events-none">
          © OpenStreetMap · CARTO
        </div>

        {/* ── Légende (bas gauche) ──────────────────────────────────── */}
        <div className="absolute bottom-5 left-4 z-[1000] bg-white/96 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg p-3 min-w-[148px]">
          {mode === "points" ? (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Légende</div>
              {[
                { color: "#ef4444", label: "Urgente" },
                { color: "#f97316", label: "En retard" },
                { color: "#f59e0b", label: "Haute priorité" },
                { color: "#3b82f6", label: "En cours" },
                { color: "#6366f1", label: "Nouveau" },
                { color: "#10b981", label: "Terminé" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 py-0.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-white/60 shadow-sm"
                    style={{ background: color }}
                  />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Intensité</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-28 rounded-full" style={{
                  background: "linear-gradient(to right, #3b82f6 0%, #22d3ee 25%, #f59e0b 55%, #f97316 75%, #ef4444 100%)"
                }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Faible</span>
                <span>Élevée</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 leading-tight">
                Zones foncées = concentration de demandes
              </div>
            </>
          )}
        </div>

        {/* ── Message si aucun point ────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl px-6 py-5 text-center border border-slate-200">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-sm font-semibold text-slate-700">Aucune demande sur cette zone</p>
              <p className="text-xs text-slate-400 mt-1">Essayez de modifier les filtres</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

