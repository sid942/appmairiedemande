import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware Edge — s'exécute avant chaque réponse sur Vercel.
 *
 * Pour la route /embed on :
 *   1. Supprime X-Frame-Options  (s'il avait été posé par une couche inférieure)
 *   2. Pose Content-Security-Policy: frame-ancestors *
 *      → autorise l'intégration dans un <iframe> depuis n'importe quel domaine
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname === "/embed") {
    // Supprimer toute restriction d'iframe venue d'une couche antérieure
    response.headers.delete("X-Frame-Options");
    // Autoriser l'embed depuis tous les domaines (norme CSP Level 2+)
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  }

  return response;
}

export const config = {
  matcher: ["/embed"],
};
