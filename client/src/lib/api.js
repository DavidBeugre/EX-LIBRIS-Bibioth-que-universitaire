const BASE_URL = "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, motDePasse) => request("/auth/login", { method: "POST", body: { email, motDePasse } }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),

  listBooks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/ouvrages${qs ? `?${qs}` : ""}`);
  },
  getBook: (id) => request(`/ouvrages/${id}`),
  createBook: (payload, token) => request("/ouvrages", { method: "POST", body: payload, token }),
  updateBook: (id, payload, token) => request(`/ouvrages/${id}`, { method: "PUT", body: payload, token }),
  deleteBook: (id, token) => request(`/ouvrages/${id}`, { method: "DELETE", token }),
  addCopy: (id, codeBarres, token) => request(`/ouvrages/${id}/exemplaires`, { method: "POST", body: { codeBarres }, token }),

  listLoans: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/emprunts${qs ? `?${qs}` : ""}`, { token });
  },
  borrowBook: (ouvrageId, token, adherentId) =>
    request("/emprunts", { method: "POST", body: { ouvrageId, adherentId }, token }),
  returnLoan: (id, token) => request(`/emprunts/${id}/retour`, { method: "POST", token }),
  renewLoan: (id, token) => request(`/emprunts/${id}/prolongation`, { method: "POST", token }),

  listReservations: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reservations${qs ? `?${qs}` : ""}`, { token });
  },
  createReservation: (ouvrageId, token, adherentId) =>
    request("/reservations", { method: "POST", body: { ouvrageId, adherentId }, token }),
  cancelReservation: (id, token) => request(`/reservations/${id}`, { method: "DELETE", token }),

  listMembers: (token, search) => request(`/adherents${search ? `?search=${search}` : ""}`, { token }),

  getOutbox: (token) => request("/notifications/outbox", { token }),
  runReminders: (token, joursAvant = 2) => request("/notifications/rappels/executer", { method: "POST", body: { joursAvant }, token }),

  listPenalties: (token, adherentId) =>
    request(`/penalites${adherentId ? `?adherentId=${adherentId}` : ""}`, { token }),
  payPenalty: (id, token) => request(`/penalites/${id}/payer`, { method: "POST", token }),

  dashboardStats: (token) => request("/stats/dashboard", { token }),
  downloadExport: async (format, token) => {
    const res = await fetch(`${BASE_URL}/stats/export/activity.${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Échec de l'export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-exlibris.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
