import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { bookCreateSchema, bookUpdateSchema } from "../utils/schemas.js";
import * as booksService from "../services/books.service.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { search, categorie } = req.query;
  res.json(await booksService.listBooks({ search, categorie }));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  res.json(await booksService.getBook(req.params.id));
}));

router.post(
  "/",
  requireAuth,
  requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"),
  validate(bookCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await booksService.createBook(req.body));
  })
);

router.put(
  "/:id",
  requireAuth,
  requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"),
  validate(bookUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await booksService.updateBook(req.params.id, req.body));
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"),
  asyncHandler(async (req, res) => {
    await booksService.deleteBook(req.params.id);
    res.status(204).send();
  })
);

router.post(
  "/:id/exemplaires",
  requireAuth,
  requireRole("BIBLIOTHECAIRE", "ADMINISTRATEUR"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await booksService.addCopy(req.params.id, req.body.codeBarres));
  })
);

export default router;
