import "dotenv/config";
import { createApp } from "./app.js";
import { runDueDateReminders } from "./services/reminders.service.js";

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`✓ Ex Libris API démarrée sur http://localhost:${port}`);
});

// Planificateur simple : vérifie une fois par jour les emprunts arrivant à
// échéance sous 2 jours et envoie un rappel. En production, un vrai
// ordonnanceur (cron système, node-cron, file de tâches) est préférable ;
// ce setInterval suffit pour la démonstration et les petits déploiements.
const UNE_JOURNEE = 24 * 60 * 60 * 1000;
setInterval(() => {
  runDueDateReminders(2).catch((e) => console.error("Erreur job de rappels :", e.message));
}, UNE_JOURNEE);
