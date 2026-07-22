import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table.jsx";

const PROFIL_LABEL = {
  ETUDIANT: "Étudiant",
  ENSEIGNANT_CHERCHEUR: "Enseignant-chercheur",
  PERSONNEL_ADMINISTRATIF: "Personnel administratif",
};

export default function AdminMembers() {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMembers(await api.listMembers(token, q));
      setLoading(false);
    };
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Adhérents</h1>
      <p className="mt-1 text-sm text-ink-muted">{members.length} adhérent{members.length > 1 ? "s" : ""}</p>

      <div className="relative mt-5 w-full sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom, email…" className="pl-9" />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-faint">Chargement…</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Emprunts en cours</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.adherent_id}>
                  <TableCell className="font-medium">{m.prenom} {m.nom}</TableCell>
                  <TableCell className="text-ink-muted">{m.email}</TableCell>
                  <TableCell>{PROFIL_LABEL[m.type_profil]}</TableCell>
                  <TableCell>{m.emprunts_en_cours} / {m.quota_emprunt}</TableCell>
                  <TableCell>
                    {m.statut === "ACTIF" ? <Badge tone="moss">Actif</Badge> : <Badge tone="buckram">Suspendu</Badge>}
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
