import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

beforeEach(() => {
  global.fetch = vi.fn();
  localStorage.clear();
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login", () => {
  test("affiche le formulaire avec les champs pré-remplis de démonstration", () => {
    renderLogin();
    expect(screen.getByText("Ex Libris")).toBeInTheDocument();
    expect(screen.getByDisplayValue("etudiant@universite.ci")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });

  test("les boutons de comptes de démonstration remplissent le champ email", async () => {
    renderLogin();
    await userEvent.click(screen.getByText("Bibliothécaire"));
    expect(screen.getByDisplayValue("bibliothecaire@universite.ci")).toBeInTheDocument();
  });

  test("affiche un message d'erreur si la connexion échoue", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Identifiants incorrects." }),
    });

    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText("Identifiants incorrects.")).toBeInTheDocument();
    });
  });

  test("appelle l'API de connexion avec les identifiants saisis", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: { email: "etudiant@universite.ci" }, token: "tok-123" }),
    }).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "1", email: "etudiant@universite.ci", role: "ADHERENT" }),
    });

    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
