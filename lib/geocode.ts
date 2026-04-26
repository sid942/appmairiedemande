/**
 * Géocodage via Nominatim (OpenStreetMap)
 * Gratuit, pas de clé API, limite d'1 req/sec — suffisant pour un MVP.
 *
 * Biais : recherche priorisée dans la zone de Fresnes (94260).
 */

// Bounding box de Fresnes (élargie pour couvrir les quartiers limitrophes)
const FRESNES_VIEWBOX = "2.290,48.775,2.355,48.735"; // left,top,right,bottom

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName?: string;
}

/**
 * Géocode une adresse textuelle vers des coordonnées GPS.
 * Retourne null si aucune correspondance trouvée.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;

  // Ajoute "Fresnes" à la requête si l'utilisateur ne l'a pas précisé
  const hasCityHint = /fresnes|94260/i.test(address);
  const query = hasCityHint ? address : `${address}, 94260 Fresnes, France`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fr");
  url.searchParams.set("viewbox", FRESNES_VIEWBOX);
  url.searchParams.set("bounded", "0"); // préférence, pas restriction stricte
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim exige un User-Agent identifiant l'application
        "User-Agent": "DemandeMairie/1.0 (demo)",
        "Accept-Language": "fr",
      },
    });

    if (!res.ok) {
      console.warn("[geocode] Nominatim HTTP", res.status);
      return null;
    }

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      console.info("[geocode] Aucun résultat pour:", query);
      return null;
    }

    const first = results[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng, displayName: first.display_name };
  } catch (err) {
    console.warn("[geocode] Erreur fetch Nominatim:", err);
    return null;
  }
}
