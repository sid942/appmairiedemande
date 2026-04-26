import { NextRequest, NextResponse } from "next/server";
import type { Ticket } from "@/types";
import { CATEGORY_LABELS, TYPE_LABELS, PRIORITY_LABELS } from "@/types";

/**
 * POST /api/dispatch
 * Body: { ticket: Ticket, emails: string[], message?: string }
 *
 * Envoie un e-mail de notification au(x) service(s) avec une copie complète
 * de la demande. Utilise Resend si RESEND_API_KEY est défini, sinon log + mock.
 */
export async function POST(req: NextRequest) {
  try {
    const { ticket, emails, message } = (await req.json()) as {
      ticket: Ticket;
      emails: string[];
      message?: string;
    };

    if (!ticket || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ ok: false, error: "Paramètres invalides" }, { status: 400 });
    }

    const subject = `[Mairie de Fresnes] Nouvelle demande #${ticket.id.slice(0, 8).toUpperCase()} — ${CATEGORY_LABELS[ticket.categorie]}`;
    const html    = renderHtml(ticket, message);
    const text    = renderText(ticket, message);

    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      const from = process.env.RESEND_FROM ?? "Mairie de Fresnes <noreply@fresnes.fr>";
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: emails, subject, html, text }),
      });
      if (!r.ok) {
        const err = await r.text();
        console.error("[dispatch] Resend error:", err);
        return NextResponse.json({ ok: false, error: "Échec envoi e-mail", detail: err }, { status: 502 });
      }
      return NextResponse.json({ ok: true, provider: "resend", emails });
    }

    // ── Mode mock (démo / pas de clé) : log la demande au lieu d'envoyer
    console.log("\n══════════════════════════════════════════════════════");
    console.log("📧 [DISPATCH MOCK] E-mail simulé (RESEND_API_KEY absent)");
    console.log("══════════════════════════════════════════════════════");
    console.log("To:     ", emails.join(", "));
    console.log("Subject:", subject);
    console.log("------------------------------------------------------");
    console.log(text);
    console.log("══════════════════════════════════════════════════════\n");

    return NextResponse.json({ ok: true, provider: "mock", emails });
  } catch (e) {
    console.error("[dispatch] error:", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ─── Rendu HTML / texte ────────────────────────────────────────────────────

function renderText(t: Ticket, msg?: string): string {
  const ref = t.id.slice(0, 8).toUpperCase();
  return [
    `Nouvelle demande citoyenne — Mairie de Fresnes`,
    `Référence : #${ref}`,
    ``,
    `Catégorie  : ${CATEGORY_LABELS[t.categorie]}`,
    `Type       : ${TYPE_LABELS[t.type]}`,
    `Priorité   : ${PRIORITY_LABELS[t.priorite]}`,
    `Adresse    : ${t.adresse}`,
    ``,
    `Description :`,
    t.description,
    ``,
    `Citoyen : ${t.nom ?? "Anonyme"} — ${t.contact}`,
    msg ? `\nMessage de l'admin :\n${msg}\n` : "",
    `\n→ Suivi : ${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/service`,
    `(Connectez-vous au portail service pour traiter cette demande.)`,
  ].join("\n");
}

function renderHtml(t: Ticket, msg?: string): string {
  const ref = t.id.slice(0, 8).toUpperCase();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(2,66,83,.08)">
  <div style="background:linear-gradient(135deg,#046982 0%,#024253 100%);padding:24px;color:#fff">
    <div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;opacity:.75">Mairie de Fresnes</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px">Nouvelle demande #${ref}</div>
    <div style="font-size:13px;margin-top:6px;opacity:.85">${CATEGORY_LABELS[t.categorie]} · ${PRIORITY_LABELS[t.priorite]}</div>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Catégorie</td><td style="font-weight:600">${CATEGORY_LABELS[t.categorie]}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Type</td><td style="font-weight:600">${TYPE_LABELS[t.type]}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Priorité</td><td style="font-weight:600">${PRIORITY_LABELS[t.priorite]}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Adresse</td><td style="font-weight:600">${escape(t.adresse)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Citoyen</td><td>${escape(t.nom ?? "Anonyme")} — <a href="${t.contact.includes("@") ? "mailto:" : "tel:"}${t.contact}" style="color:#046982">${escape(t.contact)}</a></td></tr>
    </table>
    <div style="margin-top:18px;padding:14px;background:#f8fafc;border-radius:10px;border-left:3px solid #046982">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Description</div>
      <div style="font-size:14px;line-height:1.55;white-space:pre-wrap">${escape(t.description)}</div>
    </div>
    ${msg ? `<div style="margin-top:14px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:13px"><strong>Message de l'admin :</strong> ${escape(msg)}</div>` : ""}
    <div style="text-align:center;margin-top:24px">
      <a href="${base}/service" style="display:inline-block;background:#046982;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px">Traiter la demande →</a>
    </div>
    <div style="margin-top:18px;font-size:12px;color:#94a3b8;text-align:center">
      Connectez-vous au portail service avec votre e-mail pour mettre à jour le statut.
    </div>
  </div>
</div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
