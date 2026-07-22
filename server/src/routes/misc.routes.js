import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as miscService from "../services/misc.service.js";
import { buildActivityReportPdf, buildActivityWorkbook } from "../services/export.service.js";
import { runDueDateReminders } from "../services/reminders.service.js";
import { outbox, isUsingRealSmtp } from "../services/notification.service.js";

const membersRouter = Router();
membersRouter.get("/", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  res.json(await miscService.listMembers({ search: req.query.search }));
}));

const penaltiesRouter = Router();
penaltiesRouter.get("/", requireAuth, asyncHandler(async (req, res) => {
  const isStaff = ["BIBLIOTHECAIRE", "ADMINISTRATEUR"].includes(req.user.role);
  const adherentId = isStaff ? req.query.adherentId : req.user.adherentId;
  res.json(await miscService.listPenalties({ adherentId }));
}));
penaltiesRouter.post("/:id/payer", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  res.json(await miscService.payPenalty(req.params.id));
}));

const statsRouter = Router();
statsRouter.get("/dashboard", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  res.json(await miscService.dashboardStats());
}));

statsRouter.get("/export/activity.pdf", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  const buffer = await buildActivityReportPdf();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rapport-activite-exlibris.pdf"`);
  res.send(buffer);
}));

statsRouter.get("/export/activity.xlsx", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  const buffer = await buildActivityWorkbook();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="export-exlibris.xlsx"`);
  res.send(buffer);
}));

const notificationsRouter = Router();
notificationsRouter.post("/rappels/executer", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  const count = await runDueDateReminders(req.body?.joursAvant ?? 2);
  res.json({ rappelsEnvoyes: count });
}));
notificationsRouter.get("/outbox", requireAuth, requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"), asyncHandler(async (req, res) => {
  res.json({ smtpReel: isUsingRealSmtp(), messages: [...outbox].reverse() });
}));

export { membersRouter, penaltiesRouter, statsRouter, notificationsRouter };
