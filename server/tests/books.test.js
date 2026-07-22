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

describe("Catalogue", () => {
  test("liste les ouvrages publiquement (sans authentification)", async () => {
    await createBook({ titre: "Livre A", isbn: "AAA-1", copies: 2 });
    await createBook({ titre: "Livre B", isbn: "AAA-2", copies: 1 });

    const res = await request(app).get("/api/ouvrages");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(Number(res.body[0].total_exemplaires)).toBeGreaterThanOrEqual(1);
  });

  test("filtre par recherche et catégorie", async () => {
    await createBook({ titre: "Introduction à Python", isbn: "PY-1", categorie: "Informatique" });
    await createBook({ titre: "Les Misérables", isbn: "LIT-1", categorie: "Littérature" });

    const res = await request(app).get("/api/ouvrages").query({ search: "Python" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].titre).toBe("Introduction à Python");

    const res2 = await request(app).get("/api/ouvrages").query({ categorie: "Littérature" });
    expect(res2.body).toHaveLength(1);
  });

  test("un adhérent ne peut pas créer d'ouvrage (403)", async () => {
    await createUser({ email: "etu@universite.ci", role: "ADHERENT" });
    const token = await loginToken("etu@universite.ci");

    const res = await request(app).post("/api/ouvrages").set("Authorization", `Bearer ${token}`).send({
      titre: "Nouveau livre", auteur: "Auteur", isbn: "NEW-1", categorie: "Sciences",
    });
    expect(res.status).toBe(403);
  });

  test("un bibliothécaire peut créer, modifier et supprimer un ouvrage", async () => {
    await createUser({ email: "biblio@universite.ci", role: "BIBLIOTHECAIRE" });
    const token = await loginToken("biblio@universite.ci");

    const createRes = await request(app).post("/api/ouvrages").set("Authorization", `Bearer ${token}`).send({
      titre: "Nouveau livre", auteur: "Auteur", isbn: "NEW-2", categorie: "Sciences", nombreExemplaires: 3,
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.exemplaires).toHaveLength(3);

    const bookId = createRes.body.id;
    const updateRes = await request(app).put(`/api/ouvrages/${bookId}`).set("Authorization", `Bearer ${token}`).send({ titre: "Titre modifié" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.titre).toBe("Titre modifié");

    const deleteRes = await request(app).delete(`/api/ouvrages/${bookId}`).set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/ouvrages/${bookId}`);
    expect(getRes.status).toBe(404);
  });

  test("refuse un ISBN dupliqué (409)", async () => {
    await createUser({ email: "biblio2@universite.ci", role: "BIBLIOTHECAIRE" });
    const token = await loginToken("biblio2@universite.ci");
    await createBook({ isbn: "DUP-1" });

    const res = await request(app).post("/api/ouvrages").set("Authorization", `Bearer ${token}`).send({
      titre: "Autre livre", auteur: "Auteur", isbn: "DUP-1", categorie: "Sciences",
    });
    expect(res.status).toBe(409);
  });
});
