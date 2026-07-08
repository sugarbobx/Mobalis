-- MOBALIS — schéma Postgres/Supabase
-- Migration depuis lib/mock/types.ts vers un vrai backend relationnel.
-- Pas encore appliqué — à valider avant exécution dans le SQL Editor Supabase.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- ENUMS
-- ============================================================
create type classe_eleve as enum ('2nde', '1ere', 'tle');
create type serie_eleve as enum ('A', 'C', 'D', 'SES');
create type statut_matiere as enum ('actif', 'inactif');
create type statut_seance as enum ('a_venir', 'terminee', 'annulee');
create type statut_paiement as enum ('paye', 'en_attente', 'en_retard');
create type type_exercice as enum ('qcm', 'libre', 'diagnostic');
create type createur_type as enum ('admin', 'repetiteur');
create type statut_assignation as enum ('a_faire', 'fait', 'corrige');
create type statut_soumission as enum ('auto_corrige', 'en_attente_correction', 'corrige_manuellement');
create type statut_passage as enum ('preconise_passage', 'preconise_redoublement', 'valide');
create type mention_bac as enum ('passable', 'assez_bien', 'bien', 'tres_bien');
create type statut_compte_eleve as enum ('actif', 'diplome');
create type frequence_notification as enum ('immediat', 'hebdomadaire');

-- ============================================================
-- MATIÈRES
-- ============================================================
create table matieres (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  statut statut_matiere not null default 'actif',
  couleur text not null,
  series serie_eleve[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- UTILISATEURS (user_id nullable : le profil peut exister avant
-- l'inscription réelle — l'admin crée l'élève, le parent s'inscrit après)
-- ============================================================
create table admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  nom text not null,
  prenom text not null
);

create table repetiteurs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  nom text not null,
  prenom text not null,
  avatar_initiales text not null,
  created_at timestamptz not null default now()
);

create table repetiteur_matieres ( -- matières enseignées
  repetiteur_id uuid references repetiteurs(id) on delete cascade,
  matiere_id uuid references matieres(id) on delete cascade,
  primary key (repetiteur_id, matiere_id)
);

create table parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  nom text not null,
  prenom text not null,
  email text not null unique,
  pref_notif_notes boolean not null default true,
  pref_notif_absences boolean not null default true,
  pref_notif_remarques boolean not null default false,
  pref_notif_paiements boolean not null default false,
  pref_notif_frequence frequence_notification not null default 'immediat',
  created_at timestamptz not null default now()
);

create table eleves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id),
  nom text not null,
  prenom text not null,
  classe classe_eleve not null,
  serie serie_eleve not null,
  style_apprentissage text not null default '',
  avatar_initiales text not null,
  date_entree date not null default current_date,
  classe_entree classe_eleve not null,
  historique_externe text,
  statut_compte statut_compte_eleve not null default 'actif',
  created_at timestamptz not null default now()
);

create table eleve_parents (
  eleve_id uuid references eleves(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  primary key (eleve_id, parent_id)
);

create table eleve_repetiteurs (
  eleve_id uuid references eleves(id) on delete cascade,
  repetiteur_id uuid references repetiteurs(id) on delete cascade,
  primary key (eleve_id, repetiteur_id)
);

create table eleve_matieres ( -- matières suivies
  eleve_id uuid references eleves(id) on delete cascade,
  matiere_id uuid references matieres(id) on delete cascade,
  primary key (eleve_id, matiere_id)
);

-- ============================================================
-- SÉANCES & ÉVALUATIONS (cahier de texte, notes)
-- ============================================================
create table seances (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id),
  matiere_id uuid not null references matieres(id),
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  lieu text not null,
  statut statut_seance not null default 'a_venir',
  contenu text,
  present boolean,
  annee_scolaire text not null,
  created_at timestamptz not null default now()
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id),
  matiere_id uuid not null references matieres(id),
  date date not null,
  note numeric(4,1),
  remarque text not null default '',
  visible_eleve boolean not null default true,
  annee_scolaire text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAIEMENTS
-- ============================================================
create table paiements (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  eleve_id uuid not null references eleves(id) on delete cascade,
  montant numeric(10,2) not null,
  date date not null,
  motif text not null,
  statut statut_paiement not null default 'en_attente',
  created_at timestamptz not null default now()
);

-- ============================================================
-- EXERCICES & ASSIGNATIONS
-- ============================================================
create table exercices (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null references matieres(id),
  type type_exercice not null,
  titre text not null,
  consigne text not null default '',
  createur createur_type not null,
  createur_id uuid not null, -- admins.id ou repetiteurs.id (polymorphe, pas de FK stricte)
  questions jsonb, -- qcm : [{ "question": "...", "choix": ["..."], "bonneReponseIndex": 0 }]
  enonce text, -- libre / diagnostic
  dans_bibliotheque boolean not null default false,
  created_at timestamptz not null default now()
);

create table assignations (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid not null references exercices(id) on delete cascade,
  repetiteur_assignant_id uuid not null references repetiteurs(id),
  date_assignation date not null default current_date,
  date_echeance date not null,
  statut statut_assignation not null default 'a_faire',
  score numeric(5,2),
  created_at timestamptz not null default now()
);

create table assignation_eleves (
  assignation_id uuid references assignations(id) on delete cascade,
  eleve_id uuid references eleves(id) on delete cascade,
  primary key (assignation_id, eleve_id)
);

create table soumissions (
  id uuid primary key default gen_random_uuid(),
  assignation_id uuid not null references assignations(id) on delete cascade,
  eleve_id uuid not null references eleves(id) on delete cascade,
  reponse_qcm int[],
  reponse_libre text,
  date timestamptz not null default now(),
  statut statut_soumission not null default 'en_attente_correction',
  score_auto numeric(5,2),
  score_final numeric(5,2),
  commentaire_correction text
);

-- ============================================================
-- RESSOURCES, MESSAGERIE, AIDE
-- ============================================================
create table ressources (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null references matieres(id),
  titre text not null,
  type text not null check (type in ('fiche', 'resume', 'correction')),
  seance_id uuid references seances(id),
  description text not null default ''
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id) on delete cascade,
  auteur text not null check (auteur in ('eleve', 'repetiteur')),
  contenu text not null,
  date timestamptz not null default now(),
  lu boolean not null default false
);

create table demandes_aide (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  matiere_id uuid not null references matieres(id),
  sujet text not null,
  date date not null default current_date,
  statut text not null default 'ouverte' check (statut in ('ouverte', 'traitee'))
);

-- ============================================================
-- GAMIFICATION & OBJECTIFS
-- ============================================================
create table badges ( -- catalogue statique
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text not null,
  icone text not null
);

create table badges_obtenus (
  badge_id uuid references badges(id) on delete cascade,
  eleve_id uuid references eleves(id) on delete cascade,
  date date not null default current_date,
  primary key (badge_id, eleve_id)
);

create table objectifs (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  repetiteur_id uuid not null references repetiteurs(id),
  matiere_id uuid not null references matieres(id),
  titre text not null,
  progression int not null default 0 check (progression between 0 and 100),
  date_echeance date not null
);

create table auto_evaluations (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  seance_id uuid not null references seances(id),
  moment text not null check (moment in ('avant', 'apres')),
  chapitre text not null,
  ressenti text not null check (ressenti in ('a_l_aise', 'pas_a_l_aise')),
  date date not null default current_date
);

-- ============================================================
-- FIN D'ANNÉE (bulletins, passage, réorientation, bac)
-- ============================================================
create table bulletins (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  annee_scolaire text not null,
  moyenne_generale numeric(4,1) not null,
  appreciation_generale text not null default '',
  unique (eleve_id, annee_scolaire)
);

create table bulletin_moyennes (
  bulletin_id uuid references bulletins(id) on delete cascade,
  matiere_id uuid references matieres(id),
  moyenne numeric(4,1) not null,
  primary key (bulletin_id, matiere_id)
);

create table passages_classe (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  annee_scolaire text not null,
  classe_actuelle classe_eleve not null,
  classe_suivante classe_eleve not null,
  statut statut_passage not null default 'preconise_passage',
  moyenne_generale numeric(4,1) not null,
  unique (eleve_id, annee_scolaire)
);

create table suggestions_reorientation (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  annee_scolaire text not null,
  serie_actuelle serie_eleve not null,
  serie_suggeree serie_eleve not null,
  motif text not null,
  transmise_au_parent boolean not null default false
);

create table resultats_bac (
  eleve_id uuid primary key references eleves(id) on delete cascade,
  annee_scolaire text not null,
  obtenu boolean not null,
  mention mention_bac
);

-- ============================================================
-- INDEX (accès les plus fréquents de l'app)
-- ============================================================
create index on seances (eleve_id);
create index on seances (repetiteur_id);
create index on evaluations (eleve_id, matiere_id);
create index on assignations (repetiteur_assignant_id);
create index on assignation_eleves (eleve_id);
create index on soumissions (assignation_id);
create index on soumissions (eleve_id);
create index on messages (eleve_id, repetiteur_id);
create index on paiements (eleve_id);
create index on exercices (matiere_id) where dans_bibliotheque = true;
