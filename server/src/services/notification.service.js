import nodemailer from "nodemailer";

const FROM = process.env.SMTP_FROM || "Ex Libris <bibliotheque@universite.ci>";

let transporter;
let usingRealSmtp = false;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    usingRealSmtp = true;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    // Aucun SMTP configuré : transport "journal" qui n'envoie rien mais
    // consigne le contenu du mail (utile en développement / démonstration,
    // et pour les tests automatisés). Basculer vers un vrai SMTP se fait
    // uniquement en renseignant SMTP_HOST dans .env — aucun changement de code.
    usingRealSmtp = false;
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export const outbox = []; // conservé en mémoire pour la démonstration / les tests

async function send({ to, subject, html, text }) {
  const t = getTransporter();
  const info = await t.sendMail({ from: FROM, to, subject, html, text });

  if (!usingRealSmtp) {
    const record = { to, subject, text: text || stripHtml(html), sentAt: new Date().toISOString() };
    outbox.push(record);
    if (outbox.length > 200) outbox.shift();
    console.log(`✉ [mail simulé] À: ${to} — Objet: ${subject}`);
  }
  return info;
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function layout(title, bodyHtml) {
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; border: 1px solid #E6DFC9; border-radius: 12px; overflow: hidden;">
      <div style="background:#1B2A4A; color:#FAF6EC; padding: 16px 24px;">
        <strong style="font-size: 18px;">Ex Libris</strong><br/>
        <span style="font-size: 12px; opacity: .8;">Bibliothèque universitaire</span>
      </div>
      <div style="padding: 24px; color:#1B2A4A; background:#FAF6EC;">
        <h2 style="margin-top:0;">${title}</h2>
        ${bodyHtml}
      </div>
    </div>`;
}

export async function sendLoanConfirmation({ to, prenom, titre, dateRetour }) {
  return send({
    to,
    subject: `Emprunt confirmé — ${titre}`,
    html: layout("Emprunt confirmé", `
      <p>Bonjour ${prenom},</p>
      <p>Vous avez emprunté <strong>${titre}</strong>.</p>
      <p>Date de retour prévue : <strong>${dateRetour}</strong></p>
      <p style="color:#5C6B84; font-size: 13px;">Vous pouvez prolonger cet emprunt depuis votre espace « Mes emprunts », sous réserve qu'aucune réservation ne soit en attente.</p>
    `),
  });
}

export async function sendReservationAvailable({ to, prenom, titre }) {
  return send({
    to,
    subject: `Disponible — ${titre}`,
    html: layout("Votre réservation est disponible", `
      <p>Bonjour ${prenom},</p>
      <p>L'ouvrage que vous avez réservé, <strong>${titre}</strong>, est maintenant disponible.</p>
      <p style="color:#5C6B84; font-size: 13px;">Merci de passer le récupérer à l'accueil de la bibliothèque dans les meilleurs délais.</p>
    `),
  });
}

export async function sendLateReturnPenalty({ to, prenom, titre, lateDays, montant }) {
  return send({
    to,
    subject: `Retard de retour — ${titre}`,
    html: layout("Pénalité de retard", `
      <p>Bonjour ${prenom},</p>
      <p>L'ouvrage <strong>${titre}</strong> a été retourné avec <strong>${lateDays} jour(s)</strong> de retard.</p>
      <p>Une pénalité de <strong>${montant} €</strong> a été appliquée à votre compte.</p>
      <p style="color:#5C6B84; font-size: 13px;">Tout nouvel emprunt est bloqué jusqu'au règlement de cette pénalité auprès du personnel de la bibliothèque.</p>
    `),
  });
}

export async function sendDueDateReminder({ to, prenom, titre, dateRetour }) {
  return send({
    to,
    subject: `Rappel — retour prévu bientôt : ${titre}`,
    html: layout("Rappel d'échéance", `
      <p>Bonjour ${prenom},</p>
      <p>Nous vous rappelons que l'ouvrage <strong>${titre}</strong> doit être retourné le <strong>${dateRetour}</strong>.</p>
      <p style="color:#5C6B84; font-size: 13px;">Pensez à le prolonger en ligne si vous en avez encore besoin.</p>
    `),
  });
}

export function isUsingRealSmtp() {
  return usingRealSmtp;
}
