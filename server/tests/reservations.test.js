import request from "supertest";
import { createApp } from "../src/app.js";
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

describe("Réservations", () => {
  test("refuse la réservation d'un ouvrage disponible", async () => {
    await createUser({ email: "r1@universite.ci" });
    const token = await loginToken("r1@universite.ci");
    const bookId = await createBook({ isbn: "RES-1", copies: 1 });

    const res = await request(app).post("/api/reservations").set("Authorization", `Bearer ${token}`).send({ ouvrageId: bookId });
    expect(res.status).toBe(400);
  });

  test("permet la réservation d'un ouvrage indisponible et l'honore automatiquement au retour", async () => {
    await createUser({ email: "emprunteur@universite.ci" });
    const emprunteurToken = await loginToken("emprunteur@universite.ci");
    await createUser({ email: "reservataire@universite.ci" });
    const reservataireToken = await loginToken("reservataire@universite.ci");
    await createUser({ email: "biblio@universite.ci", role: "BIBLIOTHECAIRE" });
    const staffToken = await loginToken("biblio@universite.ci");

    const bookId = await createBook({ isbn: "RES-2", copies: 1 });
    const loanRes = await request(app).post("/api/emprunts").set("Authorization", `Bearer ${emprunteurToken}`).send({ ouvrageId: bookId });

    const reservationRes = await request(app).post("/api/reservations").set("Authorization", `Bearer ${reservataireToken}`).send({ ouvrageId: bookId });
    expect(reservationRes.status).toBe(201);
    expect(reservationRes.body.statut).toBe("EN_ATTENTE");

    await request(app).post(`/api/emprunts/${loanRes.body.id}/retour`).set("Authorization", `Bearer ${staffToken}`);

    const book = await request(app).get(`/api/ouvrages/${bookId}`);
    expect(book.body.exemplaires[0].statut).toBe("RESERVE");

    const reservations = await request(app).get("/api/reservations").set("Authorization", `Bearer ${reservataireToken}`);
    expect(reservations.body[0].statut).toBe("HONOREE");
  });

  test("refuse une double réservation du même adhérent sur le même ouvrage", async () => {
    await createUser({ email: "dup1@universite.ci" });
    const t1 = await loginToken("dup1@universite.ci");
    await createUser({ email: "dup2@universite.ci" });
    const t2 = await loginToken("dup2@universite.ci");

    const bookId = await createBook({ isbn: "RES-3", copies: 1 });
    await request(app).post("/api/emprunts").set("Authorization", `Bearer ${t1}`).send({ ouvrageId: bookId });

    await request(app).post("/api/reservations").set("Authorization", `Bearer ${t2}`).send({ ouvrageId: bookId });
    const res = await request(app).post("/api/reservations").set("Authorization", `Bearer ${t2}`).send({ ouvrageId: bookId });
    expect(res.status).toBe(409);
  });

  test("permet l'annulation d'une réservation en attente", async () => {
    await createUser({ email: "cancel1@universite.ci" });
    const t1 = await loginToken("cancel1@universite.ci");
    await createUser({ email: "cancel2@universite.ci" });
    const t2 = await loginToken("cancel2@universite.ci");

    const bookId = await createBook({ isbn: "RES-4", copies: 1 });
    await request(app).post("/api/emprunts").set("Authorization", `Bearer ${t1}`).send({ ouvrageId: bookId });
    const resRes = await request(app).post("/api/reservations").set("Authorization", `Bearer ${t2}`).send({ ouvrageId: bookId });

    const cancelRes = await request(app).delete(`/api/reservations/${resRes.body.id}`).set("Authorization", `Bearer ${t2}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.statut).toBe("ANNULEE");
  });
});
