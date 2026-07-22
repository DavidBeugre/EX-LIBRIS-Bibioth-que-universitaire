import { describe, test, expect, vi, beforeEach } from "vitest";
import { api } from "../lib/api.js";

beforeEach(() => {
  global.fetch = vi.fn();
});

describe("api client", () => {
  test("login envoie les bons paramètres et retourne le token", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: { email: "a@b.com" }, token: "abc123" }),
    });

    const result = await api.login("a@b.com", "pass");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", motDePasse: "pass" }),
      })
    );
    expect(result.token).toBe("abc123");
  });

  test("propage un message d'erreur lisible en cas d'échec", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Identifiants incorrects." }),
    });

    await expect(api.login("a@b.com", "wrong")).rejects.toThrow("Identifiants incorrects.");
  });

  test("ajoute le header Authorization quand un token est fourni", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "1" }) });

    await api.me("mon-token");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer mon-token");
  });

  test("listBooks construit correctement la query string", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

    await api.listBooks({ search: "python", categorie: "Informatique" });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("search=python");
    expect(url).toContain("categorie=Informatique");
  });

  test("gère une réponse 204 sans corps (ex: suppression)", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 204 });
    const result = await api.deleteBook("id-1", "token");
    expect(result).toBeNull();
  });
});
