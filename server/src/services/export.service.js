import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { query } from "../db/pool.js";
import { dashboardStats } from "./misc.service.js";

const INK = "#1B2A4A";
const MOSS = "#3F6B4F";
const BUCKRAM = "#A5433A";

// ---------------------------------------------------------------
// PDF — rapport d'activité
// ---------------------------------------------------------------
export async function buildActivityReportPdf() {
  const stats = await dashboardStats();
  const loansRes = await query(
    `SELECT e.*, o.titre, u.nom, u.prenom,
            (e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE) AS en_retard
     FROM emprunts e
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     WHERE e.date_retour_effective IS NULL
     ORDER BY e.date_retour_prevue ASC`
  );

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fillColor(INK).fontSize(22).font("Helvetica-Bold").text("Ex Libris", { continued: false });
  doc.fontSize(12).font("Helvetica").fillColor("#5C6B84").text("Rapport d'activité — Bibliothèque universitaire");
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#8B96A8").text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`);
  doc.moveDown(1.2);

  doc.strokeColor("#E6DFC9").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // KPIs
  doc.fontSize(13).font("Helvetica-Bold").fillColor(INK).text("Indicateurs clés");
  doc.moveDown(0.5);
  const kpis = [
    ["Emprunts en cours", stats.empruntsEnCours],
    ["Emprunts en retard", stats.empruntsEnRetard],
    ["Réservations en attente", stats.reservationsEnAttente],
    ["Pénalités impayées", `${stats.penalitesImpayeesTotal.toFixed(2)} €`],
  ];
  const kpiY = doc.y;
  kpis.forEach((k, i) => {
    const x = 50 + (i % 4) * 124;
    doc.fontSize(8).font("Helvetica").fillColor("#8B96A8").text(k[0].toUpperCase(), x, kpiY, { width: 115 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor(INK).text(String(k[1]), x, kpiY + 12, { width: 115 });
  });
  doc.y = kpiY + 45;
  doc.moveDown(1);

  // Top ouvrages
  doc.fontSize(13).font("Helvetica-Bold").fillColor(INK).text("Ouvrages les plus empruntés");
  doc.moveDown(0.5);
  stats.topOuvrages.forEach((o, i) => {
    doc.fontSize(10).font("Helvetica").fillColor(INK).text(`${i + 1}. ${o.titre}`, { continued: true });
    doc.fillColor("#8B96A8").text(`  —  ${o.emprunts} emprunt(s)`);
  });
  doc.moveDown(1.2);

  // Emprunts en cours
  doc.fontSize(13).font("Helvetica-Bold").fillColor(INK).text("Emprunts en cours");
  doc.moveDown(0.5);

  const colX = [50, 220, 350, 460];
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#5C6B84");
  doc.text("Adhérent", colX[0], doc.y, { width: 160, continued: false });
  let headerY = doc.y - 11;
  doc.text("Ouvrage", colX[1], headerY, { width: 120 });
  doc.text("Retour prévu", colX[2], headerY, { width: 100 });
  doc.text("Statut", colX[3], headerY, { width: 80 });
  doc.moveDown(0.5);
  doc.strokeColor("#E6DFC9").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  loansRes.rows.forEach((l) => {
    const rowY = doc.y;
    if (rowY > 750) { doc.addPage(); }
    doc.fontSize(9).font("Helvetica").fillColor(INK);
    doc.text(`${l.prenom} ${l.nom}`, colX[0], doc.y, { width: 160 });
    const y2 = doc.y - 11;
    doc.text(l.titre, colX[1], y2, { width: 120 });
    doc.text(new Date(l.date_retour_prevue).toLocaleDateString("fr-FR"), colX[2], y2, { width: 100 });
    doc.fillColor(l.en_retard ? BUCKRAM : MOSS).text(l.en_retard ? "En retard" : "En cours", colX[3], y2, { width: 80 });
    doc.moveDown(0.4);
  });

  doc.end();
  return done;
}

// ---------------------------------------------------------------
// Excel — export multi-feuilles
// ---------------------------------------------------------------
export async function buildActivityWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ex Libris";
  workbook.created = new Date();

  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A4A" } };
  const headerFont = { color: { argb: "FFFFFFFF" }, bold: true };

  function styleHeader(sheet) {
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  // Feuille Emprunts
  const loansRes = await query(
    `SELECT u.nom, u.prenom, a.type_profil, o.titre, ex.code_barres,
            e.date_emprunt, e.date_retour_prevue, e.date_retour_effective,
            (e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE) AS en_retard
     FROM emprunts e
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ORDER BY e.date_emprunt DESC`
  );
  const loansSheet = workbook.addWorksheet("Emprunts");
  loansSheet.columns = [
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Profil", key: "type_profil", width: 22 },
    { header: "Ouvrage", key: "titre", width: 32 },
    { header: "Code-barres", key: "code_barres", width: 20 },
    { header: "Date emprunt", key: "date_emprunt", width: 16 },
    { header: "Retour prévu", key: "date_retour_prevue", width: 16 },
    { header: "Retour effectif", key: "date_retour_effective", width: 16 },
    { header: "En retard", key: "en_retard", width: 12 },
  ];
  loansRes.rows.forEach((r) => loansSheet.addRow({
    ...r,
    date_emprunt: r.date_emprunt ? new Date(r.date_emprunt).toLocaleDateString("fr-FR") : "",
    date_retour_prevue: r.date_retour_prevue ? new Date(r.date_retour_prevue).toLocaleDateString("fr-FR") : "",
    date_retour_effective: r.date_retour_effective ? new Date(r.date_retour_effective).toLocaleDateString("fr-FR") : "—",
    en_retard: r.en_retard ? "Oui" : "Non",
  }));
  styleHeader(loansSheet);

  // Feuille Adhérents
  const membersRes = await query(
    `SELECT u.nom, u.prenom, u.email, a.type_profil, a.quota_emprunt, a.statut,
            (SELECT COUNT(*) FROM emprunts em WHERE em.adherent_id = a.id AND em.date_retour_effective IS NULL) AS emprunts_en_cours
     FROM adherents a JOIN utilisateurs u ON u.id = a.utilisateur_id
     ORDER BY u.nom`
  );
  const membersSheet = workbook.addWorksheet("Adhérents");
  membersSheet.columns = [
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "Profil", key: "type_profil", width: 22 },
    { header: "Quota", key: "quota_emprunt", width: 10 },
    { header: "Emprunts en cours", key: "emprunts_en_cours", width: 16 },
    { header: "Statut", key: "statut", width: 12 },
  ];
  membersRes.rows.forEach((r) => membersSheet.addRow(r));
  styleHeader(membersSheet);

  // Feuille Pénalités
  const penaltiesRes = await query(
    `SELECT u.nom, u.prenom, o.titre, p.montant, p.statut_paiement, p.created_at
     FROM penalites p
     JOIN emprunts e ON e.id = p.emprunt_id
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ORDER BY p.created_at DESC`
  );
  const penaltiesSheet = workbook.addWorksheet("Pénalités");
  penaltiesSheet.columns = [
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Ouvrage", key: "titre", width: 32 },
    { header: "Montant (€)", key: "montant", width: 14 },
    { header: "Statut", key: "statut_paiement", width: 14 },
    { header: "Date", key: "created_at", width: 16 },
  ];
  penaltiesRes.rows.forEach((r) => penaltiesSheet.addRow({ ...r, created_at: new Date(r.created_at).toLocaleDateString("fr-FR") }));
  styleHeader(penaltiesSheet);

  // Feuille Catalogue
  const catalogRes = await query(
    `SELECT o.titre, o.auteur, o.isbn, o.categorie,
            COUNT(e.id) AS total_exemplaires,
            COUNT(e.id) FILTER (WHERE e.statut = 'DISPONIBLE') AS disponibles
     FROM ouvrages o LEFT JOIN exemplaires e ON e.ouvrage_id = o.id
     GROUP BY o.id ORDER BY o.titre`
  );
  const catalogSheet = workbook.addWorksheet("Catalogue");
  catalogSheet.columns = [
    { header: "Titre", key: "titre", width: 32 },
    { header: "Auteur", key: "auteur", width: 22 },
    { header: "ISBN", key: "isbn", width: 18 },
    { header: "Catégorie", key: "categorie", width: 16 },
    { header: "Total exemplaires", key: "total_exemplaires", width: 16 },
    { header: "Disponibles", key: "disponibles", width: 14 },
  ];
  catalogRes.rows.forEach((r) => catalogSheet.addRow(r));
  styleHeader(catalogSheet);

  return workbook.xlsx.writeBuffer();
}
