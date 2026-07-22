import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, BookPlus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { categoryStyle } from "../lib/theme.js";
import { Input } from "../components/ui/input.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Select } from "../components/ui/select.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table.jsx";

const CATEGORIES = ["Informatique", "Littérature", "Histoire", "Sciences", "Droit", "Économie"];
const EMPTY_FORM = { titre: "", auteur: "", isbn: "", editeur: "", categorie: "Informatique", resume: "", nombreExemplaires: 1 };

export default function AdminCatalogue() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // book object or "new" or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copyBarcode, setCopyBarcode] = useState("");

  const load = async () => {
    setLoading(true);
    setBooks(await api.listBooks({ search: q }));
    setLoading(false);
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]); // eslint-disable-line

  const openCreate = () => { setForm(EMPTY_FORM); setEditing("new"); setError(""); };
  const openEdit = async (b) => {
    const full = await api.getBook(b.id);
    setForm({ titre: full.titre, auteur: full.auteur, isbn: full.isbn, editeur: full.editeur || "", categorie: full.categorie, resume: full.resume || "", exemplaires: full.exemplaires });
    setEditing(full);
    setError("");
    setCopyBarcode("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (editing === "new") {
        await api.createBook({ ...form, nombreExemplaires: Number(form.nombreExemplaires) || 1 }, token);
      } else {
        const { nombreExemplaires, exemplaires, ...payload } = form;
        await api.updateBook(editing.id, payload, token);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.deleteBook(id, token);
      setConfirmDelete(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addCopy = async () => {
    if (!copyBarcode.trim()) return;
    setBusy(true);
    try {
      await api.addCopy(editing.id, copyBarcode.trim(), token);
      const full = await api.getBook(editing.id);
      setForm((f) => ({ ...f, exemplaires: full.exemplaires }));
      setCopyBarcode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Catalogue — Gestion</h1>
          <p className="mt-1 text-sm text-ink-muted">{books.length} ouvrage{books.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Nouvel ouvrage</Button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre, auteur, ISBN…" className="pl-9" />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-faint">Chargement…</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Exemplaires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b) => {
                const s = categoryStyle(b.categorie);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.titre}</TableCell>
                    <TableCell className="text-ink-muted">{b.auteur}</TableCell>
                    <TableCell><Badge style={{ color: s.fg, backgroundColor: s.bg }}>{b.categorie}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{b.exemplaires_disponibles} / {b.total_exemplaires}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(b)}><Trash2 className="h-4 w-4 text-buckram" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Formulaire création / édition */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing === "new" ? "Nouvel ouvrage" : "Modifier l'ouvrage"}</DialogTitle>
            </DialogHeader>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Titre</label>
                  <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Auteur</label>
                  <Input value={form.auteur} onChange={(e) => setForm({ ...form, auteur: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">ISBN</label>
                  <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} disabled={editing !== "new"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Éditeur</label>
                  <Input value={form.editeur} onChange={(e) => setForm({ ...form, editeur: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Catégorie</label>
                  <Select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                {editing === "new" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Nombre d'exemplaires</label>
                    <Input type="number" min="1" max="50" value={form.nombreExemplaires} onChange={(e) => setForm({ ...form, nombreExemplaires: e.target.value })} />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Résumé</label>
                <Textarea value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })} rows={3} />
              </div>

              {editing !== "new" && (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">Exemplaires ({form.exemplaires?.length || 0})</label>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {form.exemplaires?.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-ink-muted">{ex.code_barres}</span>
                        {ex.statut === "DISPONIBLE" && <Badge tone="moss">Disponible</Badge>}
                        {ex.statut === "EMPRUNTE" && <Badge tone="brass">Emprunté</Badge>}
                        {ex.statut === "RESERVE" && <Badge tone="brass">Réservé</Badge>}
                        {ex.statut === "PERDU" && <Badge tone="buckram">Perdu</Badge>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input value={copyBarcode} onChange={(e) => setCopyBarcode(e.target.value)} placeholder="Nouveau code-barres…" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={addCopy} className="gap-1.5"><BookPlus className="h-3.5 w-3.5" /> Ajouter</Button>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-buckram">{error}</p>}

            <Button onClick={save} disabled={busy} className="mt-4 w-full">
              {busy ? "Enregistrement…" : editing === "new" ? "Créer l'ouvrage" : "Enregistrer les modifications"}
            </Button>
          </DialogContent>
        )}
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        {confirmDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Supprimer cet ouvrage ?</DialogTitle></DialogHeader>
            <p className="text-sm text-ink-muted">
              « {confirmDelete.titre} » et tous ses exemplaires seront définitivement supprimés. Cette action est irréversible.
            </p>
            {error && <p className="mt-2 text-sm text-buckram">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Annuler</Button>
              <Button variant="default" style={{ backgroundColor: "#A5433A" }} className="flex-1" onClick={() => remove(confirmDelete.id)} disabled={busy}>
                {busy ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
