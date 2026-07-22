import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { registerSchema, loginSchema } from "../utils/schemas.js";
import * as authService from "../services/auth.service.js";
import { query } from "../db/pool.js";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const userRes = await query("SELECT id, nom, prenom, email, role FROM utilisateurs WHERE id = $1", [req.user.id]);
  res.json({ ...userRes.rows[0], adherentId: req.user.adherentId });
}));

export default router;
