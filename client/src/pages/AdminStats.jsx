import React, { useEffect, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Button } from "../components/ui/button.jsx";

function StatCard({ label, value, tone }) {
  const tones = { ink: "text-ink", moss: "text-moss", brass: "text-brass", buckram: "text-buckram" };
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    api.dashboardStats(token).then(setStats);
  }, [token]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await api.downloadExport(format, token);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  if (!stats) return <p className="text-sm text-ink-faint">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Statistiques</h1>
          <p className="mt-1 text-sm text-ink-muted">Vue d'ensemble de l'activité de la bibliothèque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("pdf")} disabled={exporting === "pdf"}>
            <FileDown className="h-3.5 w-3.5" /> {exporting === "pdf" ? "Génération…" : "Export PDF"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("xlsx")} disabled={exporting === "xlsx"}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> {exporting === "xlsx" ? "Génération…" : "Export Excel"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Emprunts en cours" value={stats.empruntsEnCours} tone="ink" />
        <StatCard label="En retard" value={stats.empruntsEnRetard} tone="buckram" />
        <StatCard label="Réservations en attente" value={stats.reservationsEnAttente} tone="brass" />
        <StatCard label="Pénalités impayées" value={`${stats.penalitesImpayeesTotal.toFixed(2)} €`} tone="buckram" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="mb-4 font-display text-lg font-medium text-ink">Ouvrages les plus empruntés</h2>
        <div className="space-y-3">
          {stats.topOuvrages.map((o, i) => (
            <div key={o.titre} className="flex items-center gap-3">
              <span className="w-5 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm text-ink">{o.titre}</span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#EDE7D6]">
                <div
                  className="h-full rounded-full bg-moss transition-all duration-500"
                  style={{ width: `${(Number(o.emprunts) / Number(stats.topOuvrages[0].emprunts)) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-mono text-xs text-ink-muted">{o.emprunts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
