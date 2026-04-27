import { NextRequest, NextResponse } from "next/server";

export interface RapportStats {
  type: "journalier" | "mensuel";
  from: string;
  to: string;
  total: number;
  nouveau: number;
  en_cours: number;
  transmis: number;
  termine: number;
  ferme: number;
  overdue: number;
  urgent: number;
  byCategory: Record<string, number>;
  byService: Record<string, number>;
  byPriority: Record<string, number>;
  avgAgeDays: number;
  satisfactionAvg?: number;
}

export interface RapportAIResult {
  executive_summary: string;
  highlights: string[];
  recommendations: string[];
  conclusion: string;
}

function extractJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const first = raw.indexOf("{");
  const last  = raw.lastIndexOf("}");
  if (first !== -1 && last !== -1) return raw.slice(first, last + 1);
  return raw.trim();
}

function generateFallback(stats: RapportStats): RapportAIResult {
  const treatmentRate = stats.total > 0
    ? Math.round(((stats.termine + stats.ferme) / stats.total) * 100)
    : 0;

  const topCat = Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "inconnue";

  const topSvc = Object.entries(stats.byService)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "inconnu";

  return {
    executive_summary:
      `Sur la période du ${stats.from} au ${stats.to}, la ville de Fresnes a enregistré ${stats.total} demande(s) citoyenne(s). ` +
      `Le taux de traitement s'établit à ${treatmentRate}%. ` +
      `${stats.overdue > 0 ? `${stats.overdue} demande(s) sont en retard et nécessitent une attention particulière.` : "Aucune demande n'est en retard."}`,
    highlights: [
      `${stats.nouveau} nouvelle(s) demande(s) en attente de prise en charge`,
      `Catégorie la plus sollicitée : ${topCat} (${stats.byCategory[topCat] ?? 0} demande(s))`,
      `Service le plus mobilisé : ${topSvc}`,
      stats.urgent > 0 ? `${stats.urgent} demande(s) urgente(s) à traiter en priorité` : "Aucune urgence signalée",
      `Délai moyen de traitement : ${stats.avgAgeDays.toFixed(1)} jour(s)`,
    ].filter(Boolean) as string[],
    recommendations: [
      stats.overdue > 0
        ? `Résorber les ${stats.overdue} demande(s) en retard — prioriser une revue hebdomadaire des délais`
        : "Maintenir la réactivité de traitement actuelle",
      `Renforcer les effectifs du service "${topSvc}" qui concentre le plus de demandes`,
      stats.urgent > 0
        ? "Mettre en place une procédure d'escalade pour les demandes urgentes non traitées sous 24h"
        : "Consolider les bonnes pratiques de traitement des urgences",
      "Envisager des campagnes de communication ciblées sur la catégorie la plus sollicitée",
    ],
    conclusion:
      `La gestion des demandes citoyennes sur cette période témoigne d'un engagement réel des équipes municipales. ` +
      `Des marges de progression existent notamment sur la réduction des délais et le suivi des dossiers en cours.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const stats: RapportStats = await req.json();
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(generateFallback(stats));
    }

    const prompt = `Tu es un expert en gestion municipale et analyse de données publiques pour la ville de Fresnes (Val-de-Marne, France).

Voici les statistiques des demandes citoyennes pour la période du ${stats.from} au ${stats.to} (rapport ${stats.type}) :

- Total de demandes : ${stats.total}
- Nouvelles (non traitées) : ${stats.nouveau}
- En cours : ${stats.en_cours}
- Transmises aux services : ${stats.transmis}
- Terminées : ${stats.termine}
- Fermées : ${stats.ferme}
- En retard : ${stats.overdue}
- Urgentes actives : ${stats.urgent}
- Délai moyen : ${stats.avgAgeDays.toFixed(1)} jours
- Répartition par catégorie : ${JSON.stringify(stats.byCategory)}
- Répartition par service : ${JSON.stringify(stats.byService)}
- Répartition par priorité : ${JSON.stringify(stats.byPriority)}
${stats.satisfactionAvg ? `- Note de satisfaction citoyenne moyenne : ${stats.satisfactionAvg.toFixed(1)}/5` : ""}

Génère un rapport exécutif professionnel en français avec :
1. Un résumé exécutif (2-3 phrases, ton officiel et clair)
2. Les points saillants (5 highlights, formulation concise)
3. Les recommandations opérationnelles (4 recommandations concrètes et actionnables)
4. Une conclusion (2 phrases)

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "executive_summary": "string",
  "highlights": ["string", ...],
  "recommendations": ["string", ...],
  "conclusion": "string"
}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    "sonar",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(generateFallback(stats));
    }

    const data = await response.json();
    const raw  = data.choices?.[0]?.message?.content ?? "";
    const json = extractJson(raw);

    try {
      const result: RapportAIResult = JSON.parse(json);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(generateFallback(stats));
    }
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 },
    );
  }
}
