import React, { useEffect, useState } from "react";
import { Mail, Send, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";

export default function AdminNotifications() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => setData(await api.getOutbox(token));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const runReminders = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.runReminders(token, 30);
      setResult(`${res.rappelsEnvoyes} rappel(s) envoyé(s)`);
      load();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">Historique des emails envoyés par l'application</p>
        </div>
        <Button onClick={runReminders} disabled={running} className="gap-1.5">
          <Send className="h-4 w-4" /> {running ? "Envoi…" : "Déclencher les rappels d'échéance"}
        </Button>
      </div>

      {result && <p className="mt-3 text-sm text-moss">{result}</p>}

      {data && !data.smtpReel && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-white p-3 text-xs text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
          <span>
            Aucun serveur SMTP configuré (variable <code className="font-mono">SMTP_HOST</code>) : les emails sont simulés et
            consignés ci-dessous plutôt qu'envoyés réellement. Renseignez <code className="font-mono">SMTP_HOST</code> /
            <code className="font-mono"> SMTP_USER</code> / <code className="font-mono">SMTP_PASS</code> dans <code className="font-mono">.env</code> pour un envoi réel, sans changement de code.
          </span>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {data?.messages.length === 0 && <p className="text-sm text-ink-faint">Aucun email envoyé pour le moment.</p>}
        {data?.messages.map((m, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                <div>
                  <p className="text-sm font-medium text-ink">{m.subject}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">À : {m.to}</p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-faint">{m.text}</p>
                </div>
              </div>
              <Badge tone="ink" className="shrink-0">{new Date(m.sentAt).toLocaleString("fr-FR")}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
