import { z } from "zod";

export const registerSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  motDePasse: z.string().min(6, "6 caractères minimum"),
  role: z.enum(["ADMINISTRATEUR", "BIBLIOTHECAIRE", "ADHERENT"]).default("ADHERENT"),
  typeProfil: z.enum(["ETUDIANT", "ENSEIGNANT_CHERCHEUR", "PERSONNEL_ADMINISTRATIF"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(1),
});

export const bookCreateSchema = z.object({
  titre: z.string().min(1),
  auteur: z.string().min(1),
  isbn: z.string().min(5),
  editeur: z.string().optional(),
  categorie: z.string().min(1),
  resume: z.string().optional(),
  nombreExemplaires: z.number().int().min(1).max(50).default(1),
});

export const bookUpdateSchema = bookCreateSchema.partial().omit({ nombreExemplaires: true });

export const borrowSchema = z.object({
  ouvrageId: z.string().uuid(),
  adherentId: z.string().uuid().optional(), // requis si appelé par un bibliothécaire
});

export const reservationSchema = z.object({
  ouvrageId: z.string().uuid(),
  adherentId: z.string().uuid().optional(),
});
