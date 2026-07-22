import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryBig, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";

const DEMO_ACCOUNTS = [
  { label: "Étudiant", email: "etudiant@universite.ci" },
  { label: "Enseignant-chercheur", email: "enseignant@universite.ci" },
  { label: "Bibliothécaire", email: "bibliothecaire@universite.ci" },
  { label: "Administrateur", email: "admin@universite.ci" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("etudiant@universite.ci");
  const [motDePasse, setMotDePasse] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, motDePasse);
      navigate("/catalogue");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LibraryBig className="mb-2 h-8 w-8 text-ink" />
          <h1 className="font-display text-2xl font-semibold text-ink">Ex Libris</h1>
          <p className="mt-1 text-sm text-ink-muted">Bibliothèque universitaire</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mb-4" />

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Mot de passe</label>
          <Input value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} type="password" required className="mb-4" />

          {error && <p className="mb-4 text-sm text-buckram">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full gap-2">
            <LogIn className="h-4 w-4" /> {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-dashed border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Comptes de démonstration</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setMotDePasse("password123"); }}
                className="rounded-lg border border-border bg-paper px-2 py-1.5 text-left text-xs text-ink-muted transition-colors hover:bg-[#EFE9D8]"
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint font-mono">Mot de passe : password123</p>
        </div>
      </div>
    </div>
  );
}
