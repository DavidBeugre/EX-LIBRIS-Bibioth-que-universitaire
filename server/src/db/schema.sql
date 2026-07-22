-- ============================================================
-- Ex Libris — schéma de base de données PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE role_utilisateur AS ENUM ('ADMINISTRATEUR', 'BIBLIOTHECAIRE', 'ADHERENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE type_profil AS ENUM ('ETUDIANT', 'ENSEIGNANT_CHERCHEUR', 'PERSONNEL_ADMINISTRATIF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_adherent AS ENUM ('ACTIF', 'SUSPENDU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_exemplaire AS ENUM ('DISPONIBLE', 'EMPRUNTE', 'RESERVE', 'PERDU', 'EN_REPARATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_reservation AS ENUM ('EN_ATTENTE', 'HONOREE', 'ANNULEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_paiement AS ENUM ('IMPAYEE', 'PAYEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS utilisateurs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom               VARCHAR(100) NOT NULL,
    prenom            VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    role              role_utilisateur NOT NULL,
    date_creation     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adherents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type_profil     type_profil NOT NULL,
    quota_emprunt   INTEGER NOT NULL DEFAULT 3,
    duree_jours     INTEGER NOT NULL DEFAULT 21,
    statut          statut_adherent NOT NULL DEFAULT 'ACTIF'
);

CREATE TABLE IF NOT EXISTS ouvrages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre       VARCHAR(255) NOT NULL,
    auteur      VARCHAR(255) NOT NULL,
    isbn        VARCHAR(20) NOT NULL UNIQUE,
    editeur     VARCHAR(150),
    categorie   VARCHAR(100) NOT NULL,
    resume      TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ouvrages_titre ON ouvrages (titre);
CREATE INDEX IF NOT EXISTS idx_ouvrages_auteur ON ouvrages (auteur);
CREATE INDEX IF NOT EXISTS idx_ouvrages_categorie ON ouvrages (categorie);

CREATE TABLE IF NOT EXISTS exemplaires (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ouvrage_id   UUID NOT NULL REFERENCES ouvrages(id) ON DELETE CASCADE,
    code_barres  VARCHAR(50) NOT NULL UNIQUE,
    statut       statut_exemplaire NOT NULL DEFAULT 'DISPONIBLE'
);

CREATE INDEX IF NOT EXISTS idx_exemplaires_ouvrage ON exemplaires (ouvrage_id);

CREATE TABLE IF NOT EXISTS emprunts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exemplaire_id          UUID NOT NULL REFERENCES exemplaires(id),
    adherent_id            UUID NOT NULL REFERENCES adherents(id),
    date_emprunt           TIMESTAMP NOT NULL DEFAULT now(),
    date_retour_prevue     DATE NOT NULL,
    date_retour_effective  DATE,
    prolongations          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emprunts_adherent ON emprunts (adherent_id);
CREATE INDEX IF NOT EXISTS idx_emprunts_exemplaire ON emprunts (exemplaire_id);

CREATE TABLE IF NOT EXISTS reservations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ouvrage_id        UUID NOT NULL REFERENCES ouvrages(id),
    adherent_id       UUID NOT NULL REFERENCES adherents(id),
    date_reservation  TIMESTAMP NOT NULL DEFAULT now(),
    statut            statut_reservation NOT NULL DEFAULT 'EN_ATTENTE'
);

CREATE INDEX IF NOT EXISTS idx_reservations_ouvrage ON reservations (ouvrage_id);
CREATE INDEX IF NOT EXISTS idx_reservations_adherent ON reservations (adherent_id);

CREATE TABLE IF NOT EXISTS penalites (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emprunt_id       UUID NOT NULL UNIQUE REFERENCES emprunts(id) ON DELETE CASCADE,
    montant          DECIMAL(6,2) NOT NULL,
    statut_paiement  statut_paiement NOT NULL DEFAULT 'IMPAYEE',
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);
