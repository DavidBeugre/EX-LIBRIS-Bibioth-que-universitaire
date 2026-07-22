import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { reservationSchema } from "../utils/schemas.js";
import * as reservationsService from "../services/reservations.service.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

function resolveAdherentId(req) {
  if (req.user.role === "ADHERENT") return req.user.adherentId;
  if (!req.body.adherentId) throw ApiError.badRequest("adherentId requis.");
  return req.body.adherentId;
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const isStaff = ["BIBLIOTHECAIRE", "ADMINISTRATEUR"].includes(req.user.role);
  const adherentId = isStaff ? req.query.adherentId : req.user.adherentId;
  res.json(await reservationsService.listReservations({ adherentId }));
}));

router.post("/", requireAuth, validate(reservationSchema), asyncHandler(async (req, res) => {
  const adherentId = resolveAdherentId(req);
  res.status(201).json(await reservationsService.createReservation({ ouvrageId: req.body.ouvrageId, adherentId }));
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const isStaff = ["BIBLIOTHECAIRE", "ADMINISTRATEUR"].includes(req.user.role);
  res.json(await reservationsService.cancelReservation(req.params.id, req.user.adherentId, isStaff));
}));

export default router;
