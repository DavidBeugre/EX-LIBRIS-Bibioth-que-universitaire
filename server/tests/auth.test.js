import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb, closeDb } from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("Auth", () => {
  test("inscription puis connexion d'un adhérent", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      nom: "Doe",
      prenom: "Jane",
      email: "jane@universite.ci",
      motDePasse: "password123",
      role: "ADHERENT",
      typeProfil: "ETUDIANT",
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user.email).toBe("jane@universite.ci");

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "jane@universite.ci",
      motDePasse: "password123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  test("refuse une inscription en double email", async () => {
    await request(app).post("/api/auth/register").send({
      nom: "Doe", prenom: "Jane", email: "dup@universite.ci", motDePasse: "password123", role: "ADHERENT", typeProfil: "ETUDIANT",
    });
    const res = await request(app).post("/api/auth/register").send({
      nom: "Doe2", prenom: "Jane2", email: "dup@universite.ci", motDePasse: "password123", role: "ADHERENT", typeProfil: "ETUDIANT",
    });
    expect(res.status).toBe(409);
  });

  test("refuse une connexion avec mauvais mot de passe", async () => {
    await request(app).post("/api/auth/register").send({
      nom: "Doe", prenom: "Jane", email: "wrong@universite.ci", motDePasse: "password123", role: "ADHERENT", typeProfil: "ETUDIANT",
    });
    const res = await request(app).post("/api/auth/login").send({ email: "wrong@universite.ci", motDePasse: "mauvais" });
    expect(res.status).toBe(401);
  });

  test("rejette une inscription avec email invalide", async () => {
    const res = await request(app).post("/api/auth/register").send({
      nom: "Doe", prenom: "Jane", email: "pas-un-email", motDePasse: "password123", role: "ADHERENT", typeProfil: "ETUDIANT",
    });
    expect(res.status).toBe(400);
  });

  test("/me retourne le profil pour un token valide", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      nom: "Doe", prenom: "Jane", email: "me@universite.ci", motDePasse: "password123", role: "ADHERENT", typeProfil: "ETUDIANT",
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@universite.ci");
  });

  test("/me rejette une requête sans token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
