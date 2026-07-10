-- MOBALIS — multi-tenancy par centre (migration 0004)
-- Chaque centre de répétition devient un espace isolé : colonne centre_id
-- sur les tables racines, helpers de résolution du centre courant, et
-- refonte des policies qui laissaient un admin (ou un "using(true)") voir
-- les données de tous les centres. Les tables enfants (séances, notes,
-- paiements…) héritent du centre via leurs FK eleve_id/repetiteur_id — les
-- policies relationnelles existantes sont déjà centre-safe par construction.

-- ============================================================
-- 1. CENTRES + centre initial (renommable ensuite dans la table)
-- ============================================================
create table centres (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ville text,
  created_at timestamptz not null default now()
);

insert into centres (id, nom)
values ('00000000-0000-4000-8000-000000000001', 'Centre Mobalis');

-- ============================================================
-- 2. centre_id SUR LES TABLES RACINES (nullable → backfill → not null)
-- ============================================================
alter table admins add column centre_id uuid references centres(id);
alter table repetiteurs add column centre_id uuid references centres(id);
alter table parents add column centre_id uuid references centres(id);
alter table eleves add column centre_id uuid references centres(id);
alter table matieres add column centre_id uuid references centres(id);
alter table exercices add column centre_id uuid references centres(id);
alter table ressources add column centre_id uuid references centres(id);

update admins set centre_id = '00000000-0000-4000-8000-000000000001';
update repetiteurs set centre_id = '00000000-0000-4000-8000-000000000001';
update parents set centre_id = '00000000-0000-4000-8000-000000000001';
update eleves set centre_id = '00000000-0000-4000-8000-000000000001';
update matieres set centre_id = '00000000-0000-4000-8000-000000000001';
update exercices set centre_id = '00000000-0000-4000-8000-000000000001';
update ressources set centre_id = '00000000-0000-4000-8000-000000000001';

alter table admins alter column centre_id set not null;
alter table repetiteurs alter column centre_id set not null;
alter table parents alter column centre_id set not null;
alter table eleves alter column centre_id set not null;
alter table matieres alter column centre_id set not null;
alter table exercices alter column centre_id set not null;
alter table ressources alter column centre_id set not null;

-- ============================================================
-- 3. HELPERS (security definer, même pattern que is_admin() en 0002)
-- ============================================================
create function current_centre_id() returns uuid
language sql security definer stable set search_path = public as $$
  select coalesce(
    (select centre_id from admins where user_id = auth.uid()),
    (select centre_id from repetiteurs where user_id = auth.uid()),
    (select centre_id from parents where user_id = auth.uid()),
    (select centre_id from eleves where user_id = auth.uid())
  );
$$;

create function eleve_in_my_centre(target uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from eleves where id = target and centre_id = current_centre_id());
$$;

create function repetiteur_in_my_centre(target uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from repetiteurs where id = target and centre_id = current_centre_id());
$$;

-- Les inserts clients (store, RLS actives) remplissent centre_id tout seuls ;
-- les inserts service_role/SQL doivent le fournir explicitement (auth.uid()
-- est null dans ce contexte, le default renverrait null → violation not null,
-- ce qui est le comportement voulu : pas de centre implicite hors session).
alter table admins alter column centre_id set default current_centre_id();
alter table repetiteurs alter column centre_id set default current_centre_id();
alter table parents alter column centre_id set default current_centre_id();
alter table eleves alter column centre_id set default current_centre_id();
alter table matieres alter column centre_id set default current_centre_id();
alter table exercices alter column centre_id set default current_centre_id();
alter table ressources alter column centre_id set default current_centre_id();

-- ============================================================
-- 4. POLICIES — TABLES RACINES (admin + using(true) → scoping centre)
-- ============================================================
drop policy "matieres_select" on matieres;
create policy "matieres_select" on matieres for select to authenticated
  using (centre_id = current_centre_id());
drop policy "matieres_admin_write" on matieres;
create policy "matieres_admin_write" on matieres for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());

drop policy "repetiteurs_admin_all" on repetiteurs;
create policy "repetiteurs_admin_all" on repetiteurs for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());

drop policy "repetiteur_matieres_select" on repetiteur_matieres;
create policy "repetiteur_matieres_select" on repetiteur_matieres for select to authenticated
  using (repetiteur_in_my_centre(repetiteur_id));
drop policy "repetiteur_matieres_admin_write" on repetiteur_matieres;
create policy "repetiteur_matieres_admin_write" on repetiteur_matieres for all to authenticated
  using (is_admin() and repetiteur_in_my_centre(repetiteur_id))
  with check (is_admin() and repetiteur_in_my_centre(repetiteur_id));

drop policy "parents_admin_all" on parents;
create policy "parents_admin_all" on parents for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());

drop policy "eleves_admin_all" on eleves;
create policy "eleves_admin_all" on eleves for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());

drop policy "exercices_admin_all" on exercices;
create policy "exercices_admin_all" on exercices for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());
drop policy "exercices_repetiteur_select_bibliotheque" on exercices;
create policy "exercices_repetiteur_select_bibliotheque" on exercices for select to authenticated
  using (dans_bibliotheque = true and current_repetiteur_id() is not null
         and centre_id = current_centre_id());

drop policy "ressources_select" on ressources;
create policy "ressources_select" on ressources for select to authenticated
  using (centre_id = current_centre_id());
drop policy "ressources_write" on ressources;
create policy "ressources_write" on ressources for all to authenticated
  using ((is_admin() or current_repetiteur_id() is not null) and centre_id = current_centre_id())
  with check ((is_admin() or current_repetiteur_id() is not null) and centre_id = current_centre_id());

-- ============================================================
-- 5. POLICIES — TABLES ENFANTS (le terme is_admin() se scope au centre)
-- ============================================================
drop policy "eleve_parents_select" on eleve_parents;
create policy "eleve_parents_select" on eleve_parents for select to authenticated
  using (parent_id = current_parent_id() or eleve_id = current_eleve_id()
         or (is_admin() and eleve_in_my_centre(eleve_id)));
drop policy "eleve_parents_admin_write" on eleve_parents;
create policy "eleve_parents_admin_write" on eleve_parents for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "eleve_repetiteurs_select" on eleve_repetiteurs;
create policy "eleve_repetiteurs_select" on eleve_repetiteurs for select to authenticated
  using (repetiteur_id = current_repetiteur_id() or eleve_id = current_eleve_id()
         or (is_admin() and eleve_in_my_centre(eleve_id)));
drop policy "eleve_repetiteurs_admin_write" on eleve_repetiteurs;
create policy "eleve_repetiteurs_admin_write" on eleve_repetiteurs for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "eleve_matieres_select" on eleve_matieres;
create policy "eleve_matieres_select" on eleve_matieres for select to authenticated
  using (eleve_id = current_eleve_id() or is_eleve_of_repetiteur(eleve_id)
         or is_eleve_of_parent(eleve_id) or (is_admin() and eleve_in_my_centre(eleve_id)));
drop policy "eleve_matieres_admin_write" on eleve_matieres;
create policy "eleve_matieres_admin_write" on eleve_matieres for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "seances_admin_all" on seances;
create policy "seances_admin_all" on seances for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "evaluations_admin_all" on evaluations;
create policy "evaluations_admin_all" on evaluations for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "paiements_admin_all" on paiements;
create policy "paiements_admin_all" on paiements for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "assignations_admin_all" on assignations;
create policy "assignations_admin_all" on assignations for all to authenticated
  using (is_admin() and repetiteur_in_my_centre(repetiteur_assignant_id))
  with check (is_admin() and repetiteur_in_my_centre(repetiteur_assignant_id));

drop policy "assignation_eleves_admin_all" on assignation_eleves;
create policy "assignation_eleves_admin_all" on assignation_eleves for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "soumissions_admin_all" on soumissions;
create policy "soumissions_admin_all" on soumissions for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "messages_admin_all" on messages;
create policy "messages_admin_all" on messages for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "demandes_aide_admin_all" on demandes_aide;
create policy "demandes_aide_admin_all" on demandes_aide for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

-- badges (catalogue) reste global — contenu générique, aucune donnée de centre.
drop policy "badges_obtenus_select_eleve" on badges_obtenus;
create policy "badges_obtenus_select_eleve" on badges_obtenus for select to authenticated
  using (eleve_id = current_eleve_id() or is_eleve_of_parent(eleve_id)
         or (is_admin() and eleve_in_my_centre(eleve_id)));
drop policy "badges_obtenus_write" on badges_obtenus;
create policy "badges_obtenus_write" on badges_obtenus for all to authenticated
  using ((is_admin() and eleve_in_my_centre(eleve_id)) or is_eleve_of_repetiteur(eleve_id))
  with check ((is_admin() and eleve_in_my_centre(eleve_id)) or is_eleve_of_repetiteur(eleve_id));

drop policy "objectifs_admin_all" on objectifs;
create policy "objectifs_admin_all" on objectifs for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "auto_evaluations_admin_all" on auto_evaluations;
create policy "auto_evaluations_admin_all" on auto_evaluations for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "bulletins_admin_all" on bulletins;
create policy "bulletins_admin_all" on bulletins for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "bulletin_moyennes_admin_all" on bulletin_moyennes;
create policy "bulletin_moyennes_admin_all" on bulletin_moyennes for all to authenticated
  using (is_admin() and exists (
    select 1 from bulletins b where b.id = bulletin_id and eleve_in_my_centre(b.eleve_id)))
  with check (is_admin() and exists (
    select 1 from bulletins b where b.id = bulletin_id and eleve_in_my_centre(b.eleve_id)));

drop policy "passages_classe_admin_all" on passages_classe;
create policy "passages_classe_admin_all" on passages_classe for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "suggestions_reorientation_admin_all" on suggestions_reorientation;
create policy "suggestions_reorientation_admin_all" on suggestions_reorientation for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

drop policy "resultats_bac_admin_all" on resultats_bac;
create policy "resultats_bac_admin_all" on resultats_bac for all to authenticated
  using (is_admin() and eleve_in_my_centre(eleve_id))
  with check (is_admin() and eleve_in_my_centre(eleve_id));

-- ============================================================
-- 6. RLS SUR CENTRES + INDEX
-- ============================================================
alter table centres enable row level security;
create policy "centres_select_own" on centres for select to authenticated
  using (id = current_centre_id());
create policy "centres_admin_update" on centres for update to authenticated
  using (is_admin() and id = current_centre_id())
  with check (is_admin() and id = current_centre_id());

create index on admins (centre_id);
create index on repetiteurs (centre_id);
create index on parents (centre_id);
create index on eleves (centre_id);
create index on matieres (centre_id);
create index on exercices (centre_id);
create index on ressources (centre_id);
