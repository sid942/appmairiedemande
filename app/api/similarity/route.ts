import { NextRequest, NextResponse } from "next/server";
import type { TicketCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/similarity
 *
 * Détection de doublons via Perplexity AI.
 * Reçoit la nouvelle demande + une liste de candidates (même catégorie, ouvertes)
 * et renvoie l'ID du candidat correspondant si la nouvelle demande est en réalité
 * un re-signalement, sinon null.
 *
 * Body :
 * {
 *   description: string,
 *   adresse: string,
 *   categorie: TicketCategory,
 *   candidates: Array<{ id, description, adresse, created_at }>
 * }
 *
 * Réponse :
 * { matchId: string | null, confidence: number, reasoning: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { description, adresse, categorie, candidates } = (await req.json()) as {
      description: string;
      adresse: string;
      categorie: TicketCategory;
      candidates: Array<{
        id: string;
        description: string;
        adresse: string;
        created_at: string;
      }>;
    };

    if (!description || !categorie || !Array.isArray(candidates)) {
      return NextResponse.json(
        { matchId: null, confidence: 0, reasoning: "Paramètres invalides" },
        { status: 400 },
      );
    }

    // Pas de candidat → pas de doublon possible.
    if (candidates.length === 0) {
      return NextResponse.json({ matchId: null, confidence: 0, reasoning: "Aucun candidat à comparer" });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;

    // Mode dégradé sans clé : heuristique simple par mots-clés + adresse.
    if (!apiKey) {
      const fallback = heuristicMatch(description, adresse, candidates);
      return NextResponse.json(fallback);
    }

    const systemPrompt = `Tu es un assistant qui détecte les doublons dans les signalements citoyens d'une mairie.
On te donne UNE nouvelle demande et une liste de demandes existantes (mêmes catégorie, encore ouvertes).
Tu dois identifier si la nouvelle demande décrit le MÊME problème concret qu'une demande existante (même objet, même lieu approximatif).

Règles strictes :
- Le lieu doit être cohérent (même rue, même secteur immédiat). Une rue différente = pas un doublon.
- Le problème doit être le même type d'objet/incident (ex : un lampadaire éteint = un autre lampadaire éteint dans la même rue → doublon ; un lampadaire éteint + un nid de poule dans la même rue → PAS un doublon).
- Si rien ne correspond clairement, renvoie null.
- Sois STRICT : en cas de doute, renvoie null.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour, avec ce format exact :
{"matchId": "<id ou null>", "confidence": <nombre 0-1>, "reasoning": "<courte explication en français, max 120 caractères>"}`;

    const userPrompt = `Catégorie : ${CATEGORY_LABELS[categorie] ?? categorie}

NOUVELLE DEMANDE :
- Adresse : ${adresse || "(non précisée)"}
- Description : ${description}

DEMANDES EXISTANTES (candidats) :
${candidates
  .map(
    (c, i) =>
      `[${i + 1}] id=${c.id}\n    Adresse : ${c.adresse || "(non précisée)"}\n    Description : ${c.description}`,
  )
  .join("\n\n")}

Question : la nouvelle demande est-elle un re-signalement de l'une de ces demandes existantes ?`;

    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("[similarity] Perplexity error:", r.status, detail);
      // Fallback heuristique en cas d'erreur API.
      const fallback = heuristicMatch(description, adresse, candidates);
      return NextResponse.json(fallback);
    }

    const data = await r.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    // Extraction du JSON (Perplexity peut entourer la réponse de balises ou de citations)
    const parsed = extractJson(raw);
    if (!parsed) {
      console.warn("[similarity] Réponse Perplexity non parsable :", raw);
      return NextResponse.json({ matchId: null, confidence: 0, reasoning: "Réponse IA non parsable" });
    }

    // Validation : matchId doit exister parmi les candidats.
    const matchId =
      parsed.matchId && candidates.some((c) => c.id === parsed.matchId)
        ? parsed.matchId
        : null;
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;

    // Seuil minimum de confiance pour valider un rattachement.
    const valid = matchId && confidence >= 0.6;

    return NextResponse.json({
      matchId: valid ? matchId : null,
      confidence,
      reasoning: parsed.reasoning ?? "",
    });
  } catch (e) {
    console.error("[similarity] error:", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json(
      { matchId: null, confidence: 0, reasoning: msg },
      { status: 500 },
    );
  }
}

// ─── Extraction JSON robuste ──────────────────────────────────────────────

function extractJson(raw: string): { matchId: string | null; confidence: number; reasoning: string } | null {
  if (!raw) return null;
  // Trim ```json ... ``` si présent
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Tentative : extraire le premier { ... } de la chaîne
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

// ─── Fallback heuristique (sans IA) ───────────────────────────────────────
//
// Match basique : on partage des mots-clés significatifs ET l'adresse contient
// un fragment de rue commun. Volontairement strict pour éviter les faux positifs.
//
function heuristicMatch(
  description: string,
  adresse: string,
  candidates: Array<{ id: string; description: string; adresse: string; created_at: string }>,
): { matchId: string | null; confidence: number; reasoning: string } {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4);

  const newWords  = new Set(norm(description));
  const newAddr   = new Set(norm(adresse));

  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const cWords = new Set(norm(c.description));
    const cAddr  = new Set(norm(c.adresse));

    const wordOverlap = [...newWords].filter((w) => cWords.has(w)).length;
    const addrOverlap = [...newAddr].filter((w) => cAddr.has(w)).length;

    if (addrOverlap === 0) continue; // adresses sans intersection → on rejette
    const score = wordOverlap * 0.6 + addrOverlap * 0.4;

    if (!best || score > best.score) best = { id: c.id, score };
  }

  if (best && best.score >= 2) {
    return {
      matchId: best.id,
      confidence: Math.min(0.7, best.score / 5),
      reasoning: "Match heuristique (sans IA) — mots-clés et adresse communs",
    };
  }
  return { matchId: null, confidence: 0, reasoning: "Aucun match heuristique" };
}
