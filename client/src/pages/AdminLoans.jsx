import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/theme.js";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table.jsx";

function StatCard({ label, value, tone }) {
  const tones = { ink: "text-ink", moss: "text-moss", brass: "text-brass", buckram: "text-buckram" };
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminLoans() {
  const { token } = useAuth();
  const [loans, setLoans] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setLoans(await api.listLoans(token, { statut: "en_cours" }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleReturn = async (id) => {
    await api.returnLoan(id, token);
    load();
  };

  const filtered = loans.filter((l) => `${l.prenom} ${l.nom} ${l.titre}`.toLowerCase().includes(q.toLowerCase()));
  const late = loans.filter((l) => l.en_retard).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Prêts &amp; retours</h1>
      <p className="mt-1 text-sm text-ink-muted">Vue bibliothécaire — suivi des emprunts en cours</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard label="Emprunts en cours" value={loans.length} tone="ink" />
        <StatCard label="Dans les temps" value={loans.length - late} tone="moss" />
        <StatCard label="En retard" value={late} tone="buckram" />
      </div>

      <div className="relative mt-6 w-full sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adhérent, ouvrage…" className="pl-9" />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-faint">Chargement…</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adhérent</TableHead>
                <TableHead>Ouvrage</TableHead>
                <TableHead>Retour prévu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.prenom} {l.nom}</p>
                    <p className="text-xs text-ink-faint">{l.type_profil}</p>
                  </TableCell>
                  <TableCell>
                    <p>{l.titre}</p>
                    <p className="font-mono text-xs text-ink-faint">{l.code_barres}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-ink-muted">{formatDate(l.date_retour_prevue)}</TableCell>
                  <TableCell>
                    {l.en_retard ? <Badge tone="buckram">En retard</Badge> : <Badge tone="moss">En cours</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleReturn(l.id)}>Marquer retourné</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
