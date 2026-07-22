import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle, RefreshCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { categoryStyle, formatDate } from "../lib/theme.js";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export default function MyLoans() {
  const { token } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await api.listLoans(token, { statut: "en_cours" });
    setLoans(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const renew = async (id) => {
    setMessage(null);
    try {
      await api.renewLoan(id, token);
      setMessage({ type: "success", text: "Emprunt prolongé avec succès." });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Mes emprunts</h1>
      <p className="mt-1 text-sm text-ink-muted">{loans.length} emprunt{loans.length > 1 ? "s" : ""} en cours</p>

      {message && (
        <div className={`mt-4 rounded-lg border px-4 py-2 text-sm ${message.type === "success" ? "border-moss text-moss bg-moss-bg" : "border-buckram text-buckram bg-buckram-bg"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-ink-faint">Chargement…</p>
      ) : loans.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">Aucun emprunt en cours. Direction le catalogue !</p>
      ) : (
        <div className="mt-6 space-y-3">
          {loans.map((loan) => {
            const s = categoryStyle(loan.categorie);
            const late = loan.en_retard;
            const daysLeft = daysBetween(new Date(), loan.date_retour_prevue);
            const totalSpan = Math.max(1, daysBetween(loan.date_emprunt, loan.date_retour_prevue));
            const elapsed = daysBetween(loan.date_emprunt, new Date());
            const pct = Math.min(100, Math.max(0, (elapsed / totalSpan) * 100));

            return (
              <div key={loan.id} className="rounded-xl border p-4 transition-shadow duration-200 hover:shadow-sm" style={{ borderColor: late ? "#A5433A" : "#E6DFC9", borderLeftWidth: 4, borderLeftColor: late ? "#A5433A" : s.fg }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{loan.titre}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{loan.auteur} · {loan.code_barres}</p>
                  </div>
                  {late ? (
                    <Badge tone="buckram"><AlertTriangle className="mr-1 inline h-3 w-3" />En retard</Badge>
                  ) : (
                    <Badge tone="moss"><Clock className="mr-1 inline h-3 w-3" />{daysLeft} j restants</Badge>
                  )}
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EDE7D6]">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: late ? "#A5433A" : "#3F6B4F" }} />
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink-faint">
                  <span>Emprunté le {formatDate(loan.date_emprunt)}</span>
                  <span>Retour prévu le {formatDate(loan.date_retour_prevue)}</span>
                </div>

                {!late && loan.prolongations < 2 && (
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => renew(loan.id)}>
                    <RefreshCcw className="h-3.5 w-3.5" /> Prolonger
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
