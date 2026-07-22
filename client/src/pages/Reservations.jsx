import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { categoryStyle, formatDate } from "../lib/theme.js";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";

export default function Reservations() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setReservations(await api.listReservations(token));
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const cancel = async (id) => {
    await api.cancelReservation(id, token);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Mes réservations</h1>
      <p className="mt-1 text-sm text-ink-muted">File d'attente sur les ouvrages actuellement indisponibles</p>

      {loading ? (
        <p className="mt-6 text-sm text-ink-faint">Chargement…</p>
      ) : reservations.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">Aucune réservation en cours.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {reservations.map((r) => {
            const s = categoryStyle(r.categorie);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: "#E6DFC9", borderLeftWidth: 4, borderLeftColor: s.fg }}>
                <div>
                  <p className="font-medium text-ink">{r.titre}</p>
                  <p className="text-xs text-ink-muted">{r.auteur} · réservé le {formatDate(r.date_reservation)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {r.statut === "EN_ATTENTE" && <Badge tone="brass">En attente</Badge>}
                  {r.statut === "HONOREE" && <Badge tone="moss">Disponible — à récupérer</Badge>}
                  {r.statut === "EN_ATTENTE" && (
                    <Button variant="ghost" size="icon" onClick={() => cancel(r.id)} title="Annuler">
                      <X className="h-4 w-4 text-buckram" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
