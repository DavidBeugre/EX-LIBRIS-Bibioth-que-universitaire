import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { borrowSchema } from "../utils/schemas.js";
import * as loansService from "../services/loans.service.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

function resolveAdherentId(req) {
  if (req.user.role === "ADHERENT") return req.user.adherentId;
  if (!req.body.adherentId) throw ApiError.badRequest("adherentId requis pour un emprunt effectué par le personnel.");
  return req.body.adherentId;
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const isStaff = ["BIBLIOTHECAIRE", "ADMINISTRATEUR"].includes(req.user.role);
  const adherentId = isStaff ? req.query.adherentId : req.user.adherentId;
  res.json(await loansService.listLoans({ adherentId, statut: req.query.statut }));
}));

router.post("/", requireAuth, validate(borrowSchema), asyncHandler(async (req, res) => {
  const adherentId = resolveAdherentId(req);
  const loan = await loansService.borrowBook({ ouvrageId: req.body.ouvrageId, adherentId });
  res.status(201).json(loan);
}));

router.post("/:id/retour", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  res.json(await loansService.returnBook(req.params.id));
}));

router.post("/:id/prolongation", requireAuth, asyncHandler(async (req, res) => {
  res.json(await loansService.renewLoan(req.params.id));
}));

export default router;
