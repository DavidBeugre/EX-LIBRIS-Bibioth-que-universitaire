import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized());
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, adherentId? }
    next();
  } catch {
    next(ApiError.unauthorized("Jeton invalide ou expiré"));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Cette action nécessite un rôle : " + roles.join(", ")));
    }
    next();
  };
}
