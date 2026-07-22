import { query } from "../db/pool.js";
import { sendDueDateReminder } from "./notification.service.js";

/**
 * Envoie un rappel pour tout emprunt en cours dont l'échéance tombe
 * dans les `joursAvant` prochains jours (par défaut 2).
 * Retourne le nombre de rappels envoyés.
 */
export async function runDueDateReminders(joursAvant = 2) {
  const res = await query(
    `SELECT u.email, u.prenom, o.titre, e.date_retour_prevue
     FROM emprunts e
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     WHERE e.date_retour_effective IS NULL
       AND e.date_retour_prevue BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval`,
    [joursAvant]
  );

  let count = 0;
  for (const loan of res.rows) {
    await sendDueDateReminder({
      to: loan.email,
      prenom: loan.prenom,
      titre: loan.titre,
      dateRetour: new Date(loan.date_retour_prevue).toLocaleDateString("fr-FR"),
    });
    count++;
  }
  return count;
}
