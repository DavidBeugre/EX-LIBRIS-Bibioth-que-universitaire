import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(ApiError.badRequest("Données invalides", result.error.flatten()));
  }
  req.body = result.data;
  next();
};
