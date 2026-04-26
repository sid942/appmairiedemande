import { Resend } from "resend";
import { Ticket, Service, TYPE_LABELS, CATEGORY_LABELS } from "@/types";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFrom() {
  return process.env.FROM_EMAIL || "noreply@demande-mairie.fr";
}

export async function sendServiceNotification(
  ticket: Ticket,
  service: Service
) {
  const typeLabel = TYPE_LABELS[ticket.type];
  const categorieLabel = CATEGORY_LABELS[ticket.categorie];

  await getResend().emails.send({
    from: getFrom(),
    to: service.email,
    subject: `[Nouveau ticket #${ticket.id.slice(0, 8)}] ${typeLabel} - ${categorieLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D4ED8;">Nouveau ticket reçu</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Référence</td>
            <td style="padding: 8px;">#${ticket.id.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; color: #555;">Type</td>
            <td style="padding: 8px;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Catégorie</td>
            <td style="padding: 8px;">${categorieLabel}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; color: #555;">Adresse</td>
            <td style="padding: 8px;">${ticket.adresse}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Description</td>
            <td style="padding: 8px;">${ticket.description}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; color: #555;">Contact</td>
            <td style="padding: 8px;">${ticket.contact}</td>
          </tr>
        </table>
        <p style="margin-top: 24px; color: #555; font-size: 14px;">
          Ce ticket vous a été assigné automatiquement. Connectez-vous au back-office pour le traiter.
        </p>
      </div>
    `,
  });
}

export async function sendCitizenConfirmation(
  contactEmail: string,
  ticketId: string
) {
  if (!contactEmail.includes("@")) return; // skip if phone number

  await getResend().emails.send({
    from: getFrom(),
    to: contactEmail,
    subject: `Votre demande a bien été reçue - #${ticketId.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D4ED8;">Demande bien reçue ✓</h2>
        <p>Votre demande a été enregistrée avec la référence :</p>
        <div style="background: #EFF6FF; padding: 16px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #1D4ED8; letter-spacing: 2px;">
          #${ticketId.slice(0, 8).toUpperCase()}
        </div>
        <p style="color: #555;">
          Votre mairie a été informée et traitera votre demande dans les meilleurs délais.
        </p>
      </div>
    `,
  });
}
