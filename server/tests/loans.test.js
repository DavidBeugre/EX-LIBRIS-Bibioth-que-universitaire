import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { resetDb, closeDb, createUser, createBook } from "./helpers.js";

const app = createApp();

async function loginToken(email, password = "password123") {
  const res = await request(app).post("/api/auth/login").send({ email, motDePasse: password });
  return res.body.token;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("Emprunts — logique métier", () => {
  test("un adhérent peut emprunter un ouvrage disponible", async () => {
    await createUser({ email: "etu1@universite.ci" });
    const token = await loginToken("etu1@universite.ci");
    const bookId = await createBook({ isbn: "EMP-1", copies: 1 });

    const res = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });
    expect(res.status).toBe(201);
    expect(res.body.date_retour_effective).toBeNull();

    const book = await request(app).get(`/api/ouvrages/${bookId}`);
    expect(book.body.exemplaires[0].statut).toBe("EMPRUNTE");
  });

  test("refuse l'emprunt si aucun exemplaire disponible (409)", async () => {
    await createUser({ email: "etu2@universite.ci" });
    const token = await loginToken("etu2@universite.ci");
    const bookId = await createBook({ isbn: "EMP-2", copies: 1 });

    await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });

    await createUser({ email: "etu3@universite.ci" });
    const token2 = await loginToken("etu3@universite.ci");
    const res = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token2}`).send({ ouvrageId: bookId });
    expect(res.status).toBe(409);
  });

  test("respecte le quota d'emprunt de l'adhérent", async () => {
    await createUser({ email: "quota@universite.ci", typeProfil: "ETUDIANT" }); // quota = 3
    const token = await loginToken("quota@universite.ci");

    for (let i = 0; i < 3; i++) {
      const bookId = await createBook({ isbn: `QUOTA-${i}`, copies: 1 });
      const res = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });
      expect(res.status).toBe(201);
    }

    const bookId4 = await createBook({ isbn: "QUOTA-3", copies: 1 });
    const res4 = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId4 });
    expect(res4.status).toBe(403);
    expect(res4.body.error).toMatch(/quota/i);
  });

  test("calcule une pénalité au retour en retard et bloque un nouvel emprunt", async () => {
    await createUser({ email: "retard@universite.ci" });
    const token = await loginToken("retard@universite.ci");
    await createUser({ email: "biblio@universite.ci", role: "BIBLIOTHECAIRE" });
    const staffToken = await loginToken("biblio@universite.ci");

    const bookId = await createBook({ isbn: "RETARD-1", copies: 1 });
    const loanRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });
    const loanId = loanRes.body.id;

    // Simule un retard de 4 jours en modifiant directement la date prévue
    await pool.query("UPDATE emprunts SET date_retour_prevue = CURRENT_DATE - INTERVAL '4 days' WHERE id = $1", [loanId]);

    const returnRes = await request(app).post(`/api/emprunts/${loanId}/retour`).set("Authorization", `Bearer ${staffToken}`);
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.lateDays).toBe(4);
    expect(returnRes.body.penalite.montant).toBe("2.00"); // 4 * 0.50

    // Nouvel emprunt bloqué tant que la pénalité n'est pas payée
    const bookId2 = await createBook({ isbn: "RETARD-2", copies: 1 });
    const blockedRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId2 });
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error).toMatch(/pénalité/i);

    // Paiement de la pénalité puis nouvel emprunt possible
    const penalties = await request(app).get("/api/penalites").set("Authorization", `Bearer ${staffToken}`);
    const penaltyId = penalties.body[0].id;
    const payRes = await request(app).post(`/api/penalites/${penaltyId}/payer`).set("Authorization", `Bearer ${staffToken}`);
    expect(payRes.status).toBe(200);
    expect(payRes.body.statut_paiement).toBe("PAYEE");

    const unblockedRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId2 });
    expect(unblockedRes.status).toBe(201);
  });

  test("aucune pénalité si retour dans les temps", async () => {
    await createUser({ email: "atemps@universite.ci" });
    const token = await loginToken("atemps@universite.ci");
    await createUser({ email: "biblio3@universite.ci", role: "BIBLIOTHECAIRE" });
    const staffToken = await loginToken("biblio3@universite.ci");

    const bookId = await createBook({ isbn: "ATEMPS-1", copies: 1 });
    const loanRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });

    const returnRes = await request(app).post(`/api/emprunts/${loanRes.body.id}/retour`).set("Authorization", `Bearer ${staffToken}`);
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.lateDays).toBe(0);
    expect(returnRes.body.penalite).toBeNull();
  });

  test("un adhérent ne peut pas déclarer lui-même un retour (réservé au personnel)", async () => {
    await createUser({ email: "selfreturn@universite.ci" });
    const token = await loginToken("selfreturn@universite.ci");
    const bookId = await createBook({ isbn: "SELF-1", copies: 1 });
    const loanRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });

    const res = await request(app).post(`/api/emprunts/${loanRes.body.id}/retour`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("prolongation refusée si une réservation est en attente", async () => {
    await createUser({ email: "prolong@universite.ci" });
    const token = await loginToken("prolong@universite.ci");
    await createUser({ email: "reservant@universite.ci" });
    const token2 = await loginToken("reservant@universite.ci");

    const bookId = await createBook({ isbn: "PROLONG-1", copies: 1 });
    const loanRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });

    await request(app).post("/api/reservations").set("Authorization", `Bearer ${token2}`).send({ ouvrageId: bookId });

    const res = await request(app).post(`/api/emprunts/${loanRes.body.id}/prolongation`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
