import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import booksRoutes from "./routes/books.routes.js";
import loansRoutes from "./routes/loans.routes.js";
import reservationsRoutes from "./routes/reservations.routes.js";
import { membersRouter, penaltiesRouter, statsRouter, notificationsRouter } from "./routes/misc.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok", service: "exlibris-api" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/ouvrages", booksRoutes);
  app.use("/api/emprunts", loansRoutes);
  app.use("/api/reservations", reservationsRoutes);
  app.use("/api/adherents", membersRouter);
  app.use("/api/penalites", penaltiesRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/notifications", notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
