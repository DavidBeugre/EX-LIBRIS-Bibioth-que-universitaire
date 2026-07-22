-- ============================================================
-- Script de création de la base de données
-- Application de gestion de bibliothèque universitaire
-- SGBD : PostgreSQL 14+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- TYPES ENUMÉRÉS ----------

CREATE TYPE role_utilisateur AS ENUM ('ADMINISTRATEUR', 'BIBLIOTHECAIRE', 'ADHERENT');
CREATE TYPE type_profil AS ENUM ('ETUDIANT', 'ENSEIGNANT_CHERCHEUR', 'PERSONNEL_ADMINISTRATIF');
CREATE TYPE statut_adherent AS ENUM ('ACTIF', 'SUSPENDU');
CREATE TYPE statut_exemplaire AS ENUM ('DISPONIBLE', 'EMPRUNTE', 'RESERVE', 'PERDU', 'EN_REPARATION');
CREATE TYPE statut_reservation AS ENUM ('EN_ATTENTE', 'HONOREE', 'ANNULEE');
CREATE TYPE statut_paiement AS ENUM ('IMPAYEE', 'PAYEE');

-- ---------- TABLE : utilisateurs ----------

CREATE TABLE utilisateurs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom               VARCHAR(100) NOT NULL,
    prenom            VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    role              role_utilisateur NOT NULL,
    date_creation     TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- TABLE : adherents ----------

CREATE TABLE adherents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id  UUID NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type_profil     type_profil NOT NULL,
    quota_emprunt   INTEGER NOT NULL DEFAULT 3,
    statut          statut_adherent NOT NULL DEFAULT 'ACTIF'
);

-- ---------- TABLE : ouvrages ----------

CREATE TABLE ouvrages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titre       VARCHAR(255) NOT NULL,
    auteur      VARCHAR(255) NOT NULL,
    isbn        VARCHAR(20) NOT NULL UNIQUE,
    editeur     VARCHAR(150),
    categorie   VARCHAR(100) NOT NULL,
    resume      TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ouvrages_titre ON ouvrages (titre);
CREATE INDEX idx_ouvrages_auteur ON ouvrages (auteur);
CREATE INDEX idx_ouvrages_categorie ON ouvrages (categorie);

-- ---------- TABLE : exemplaires ----------

CREATE TABLE exemplaires (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ouvrage_id   UUID NOT NULL REFERENCES ouvrages(id) ON DELETE CASCADE,
    code_barres  VARCHAR(50) NOT NULL UNIQUE,
    statut       statut_exemplaire NOT NULL DEFAULT 'DISPONIBLE'
);

CREATE INDEX idx_exemplaires_ouvrage ON exemplaires (ouvrage_id);

-- ---------- TABLE : emprunts ----------

CREATE TABLE emprunts (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exemplaire_id          UUID NOT NULL REFERENCES exemplaires(id),
    adherent_id            UUID NOT NULL REFERENCES adherents(id),
    date_emprunt           TIMESTAMP NOT NULL DEFAULT now(),
    date_retour_prevue     DATE NOT NULL,
    date_retour_effective  DATE
);

CREATE INDEX idx_emprunts_adherent ON emprunts (adherent_id);
CREATE INDEX idx_emprunts_exemplaire ON emprunts (exemplaire_id);

-- ---------- TABLE : reservations ----------

CREATE TABLE reservations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ouvrage_id        UUID NOT NULL REFERENCES ouvrages(id),
    adherent_id       UUID NOT NULL REFERENCES adherents(id),
    date_reservation  TIMESTAMP NOT NULL DEFAULT now(),
    statut            statut_reservation NOT NULL DEFAULT 'EN_ATTENTE'
);

CREATE INDEX idx_reservations_ouvrage ON reservations (ouvrage_id);
CREATE INDEX idx_reservations_adherent ON reservations (adherent_id);

-- ---------- TABLE : penalites ----------

CREATE TABLE penalites (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emprunt_id       UUID NOT NULL UNIQUE REFERENCES emprunts(id) ON DELETE CASCADE,
    montant          DECIMAL(6,2) NOT NULL,
    statut_paiement  statut_paiement NOT NULL DEFAULT 'IMPAYEE',
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- Fin du script
-- ============================================================
