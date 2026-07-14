-- MOBALIS — taxonomie banque de QCM (migration 0022)
-- Prépare le terrain pour la banque de ~5000 QCM : hiérarchie
-- matière → chapitre (par classe) → notion, choix/difficulté normalisés
-- (au lieu du blob jsonb existant), contenu global (centre_id NULL)
-- visible par tous les centres. `questions` (banque défis/révision) est
-- vide (0 ligne) — rien à migrer. `exercices` a 7 lignes existantes
-- (contenu tuteur) — non cassées, colonnes ajoutées nullable + backfill.

-- ============================================================
-- 1. TAXONOMIE — référentiel global, pas de centre_id (partagé par tous)
-- ============================================================
create table chapitres (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null references matieres(id) on delete cascade,
  classe classe_eleve not null,
  nom text not null,
  ordre int not null default 1,
  created_at timestamptz not null default now(),
  unique (matiere_id, classe, nom)
);

create table chapitre_series (
  chapitre_id uuid references chapitres(id) on delete cascade,
  serie serie_eleve not null,
  primary key (chapitre_id, serie)
);

create table notions (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references chapitres(id) on delete cascade,
  nom text not null,
  ordre int not null default 1,
  statut_publication text not null default 'brouillon' check (statut_publication in ('brouillon', 'publie')),
  created_at timestamptz not null default now(),
  unique (chapitre_id, nom)
);

-- ============================================================
-- 2. EXERCICES — choix/difficulté normalisés, contenu global
-- ============================================================
create type difficulte_exercice as enum ('facile', 'moyen', 'difficile', 'genius');

create table exercice_choix (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid not null references exercices(id) on delete cascade,
  texte_choix text not null,
  est_correct boolean not null default false,
  ordre int not null default 1
);

create table exercice_difficulte_serie (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid not null references exercices(id) on delete cascade,
  serie serie_eleve not null,
  difficulte difficulte_exercice not null,
  unique (exercice_id, serie)
);

alter table exercices add column notion_id uuid references notions(id);
alter table exercices add column source text;
alter table exercices add column annee_source int;
alter table exercices add column statut text not null default 'brouillon' check (statut in ('brouillon', 'publie'));

-- Backfill : les 7 lignes existantes (contenu tuteur/admin) restent visibles
-- comme avant la migration — seul le nouveau contenu de la banque démarre en brouillon.
update exercices set statut = 'publie';

-- NULL = contenu global Mobalis (banque de QCM), non-NULL = contenu propre à un centre (existant).
alter table exercices alter column centre_id drop not null;

-- ============================================================
-- 3. RLS — lecture globale en plus de l'isolation par centre existante
-- ============================================================
alter table chapitres enable row level security;
alter table chapitre_series enable row level security;
alter table notions enable row level security;
alter table exercice_choix enable row level security;
alter table exercice_difficulte_serie enable row level security;

create policy "chapitres_select" on chapitres for select to authenticated using (true);
create policy "chapitre_series_select" on chapitre_series for select to authenticated using (true);
create policy "notions_select" on notions for select to authenticated using (true);

create policy "exercices_select_global" on exercices for select to authenticated
  using (centre_id is null);

create policy "exercice_choix_select_global" on exercice_choix for select to authenticated
  using (exists (select 1 from exercices e where e.id = exercice_id and e.centre_id is null));
create policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie for select to authenticated
  using (exists (select 1 from exercices e where e.id = exercice_id and e.centre_id is null));

-- Pas de policy d'écriture sur le contenu global : la génération de la
-- banque passe par un script service_role (bypass RLS), pas par un rôle
-- applicatif. Qui/comment éditer ce contenu via l'app plus tard est une
-- décision produit à trancher séparément (proposition de déploiement).
