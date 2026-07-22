import React, { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { categoryStyle } from "../lib/theme.js";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.jsx";
import { Separator } from "../components/ui/separator.jsx";

function BookCover({ category, title }) {
  const s = categoryStyle(category);
  return (
    <div className="flex h-36 w-full items-center justify-center rounded-md transition-transform duration-300 group-hover:-translate-y-0.5" style={{ backgroundColor: s.bg }}>
      <span className="px-4 text-center font-display text-sm font-medium leading-snug" style={{ color: s.fg }}>
        {title.split(" ").slice(0, 3).join(" ")}
      </span>
    </div>
  );
}

function AvailabilityBadge({ available, total }) {
  if (available === 0) return <Badge tone="buckram">Indisponible</Badge>;
  if (available <= total / 3) return <Badge tone="brass">{available} restant{available > 1 ? "s" : ""}</Badge>;
  return <Badge tone="moss">Disponible</Badge>;
}

export default function Catalogue() {
  const { user, token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [busy, setBusy] = useState(false);

  const categories = ["Tous", "Informatique", "Littérature", "Histoire", "Sciences", "Droit", "Économie"];

  const load = async () => {
    setLoading(true);
    const data = await api.listBooks({ search: query, categorie: cat });
    setBooks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [query, cat]); // eslint-disable-line

  const openBook = async (b) => {
    const full = await api.getBook(b.id);
    setSelected(full);
    setStatus(null);
  };

  const available = (b) => Number(b.exemplaires_disponibles ?? b.exemplaires?.filter((e) => e.statut === "DISPONIBLE").length ?? 0);
  const total = (b) => Number(b.total_exemplaires ?? b.exemplaires?.length ?? 0);

  const handleAction = async () => {
    if (!selected) return;
    setBusy(true);
    setStatus(null);
    try {
      const canBorrow = available(selected) > 0;
      if (canBorrow) {
        const loan = await api.borrowBook(selected.id, token, user.adherentId);
        setStatus({ type: "success", message: `Emprunté — à rendre le ${new Date(loan.date_retour_prevue).toLocaleDateString("fr-FR")}` });
      } else {
        await api.createReservation(selected.id, token, user.adherentId);
        setStatus({ type: "success", message: "Réservation enregistrée. Vous serez notifié dès sa disponibilité." });
      }
      const refreshed = await api.getBook(selected.id);
      setSelected(refreshed);
      load();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Catalogue</h1>
          <p className="mt-1 text-sm text-ink-muted">{books.length} ouvrage{books.length > 1 ? "s" : ""} trouvé{books.length > 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, auteur, ISBN…" className="pl-9" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = c === cat;
          const s = c === "Tous" ? { fg: "#1B2A4A", bg: "#EFEDE4" } : categoryStyle(c);
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150"
              style={{ borderColor: active ? s.fg : "#E6DFC9", color: active ? s.fg : "#5C6B84", backgroundColor: active ? s.bg : "transparent" }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-ink-faint">Chargement du catalogue…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => {
            const s = categoryStyle(b.categorie);
            return (
              <button
                key={b.id}
                onClick={() => openBook(b)}
                className="group rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{ borderColor: "#E6DFC9", borderLeftWidth: 4, borderLeftColor: s.fg }}
              >
                <BookCover category={b.categorie} title={b.titre} />
                <p className="mt-3 line-clamp-2 text-sm font-medium text-ink">{b.titre}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{b.auteur}</p>
                <div className="mt-2.5">
                  <AvailabilityBadge available={available(b)} total={total(b)} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        {selected && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.titre}</DialogTitle>
            </DialogHeader>

            <div className="flex gap-4">
              <div className="w-28 shrink-0"><BookCover category={selected.categorie} title={selected.titre} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">{selected.auteur}</p>
                <div className="mt-2"><Badge tone="ink" style={{ color: categoryStyle(selected.categorie).fg, backgroundColor: categoryStyle(selected.categorie).bg }}>{selected.categorie}</Badge></div>
                <p className="mt-3 text-sm leading-relaxed text-ink">{selected.resume}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-3 font-mono text-xs text-ink-muted">
              <div><span className="block uppercase tracking-wide text-ink-faint">ISBN</span>{selected.isbn}</div>
              <div><span className="block uppercase tracking-wide text-ink-faint">Éditeur</span>{selected.editeur || "—"}</div>
              <div><span className="block uppercase tracking-wide text-ink-faint">Exemplaires</span>{total(selected)} au total</div>
              <div><span className="block uppercase tracking-wide text-ink-faint">Disponibles</span>{available(selected)}</div>
            </div>

            {!status ? (
              <Button onClick={handleAction} disabled={busy} variant={available(selected) > 0 ? "moss" : "brass"} className="mt-4 w-full">
                {busy ? "Traitement…" : available(selected) > 0 ? "Emprunter cet ouvrage" : "Réserver cet ouvrage"}
              </Button>
            ) : (
              <div
                className={`mt-4 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-mono ${
                  status.type === "success" ? "border-moss text-moss" : "border-buckram text-buckram"
                }`}
              >
                {status.type === "success" && <Check className="h-4 w-4" />}
                {status.message}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
