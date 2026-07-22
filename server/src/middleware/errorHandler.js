import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route introuvable", path: req.originalUrl });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details ?? undefined });
  }

  // Contraintes PostgreSQL courantes
  if (err.code === "23505") {
    return res.status(409).json({ error: "Cette valeur existe déjà (contrainte d'unicité violée)." });
  }
  if (err.code === "23503") {
    return res.status(409).json({ error: "Référence invalide (clé étrangère)." });
  }

  console.error(err);
  return res.status(500).json({ error: "Erreur interne du serveur." });
}
