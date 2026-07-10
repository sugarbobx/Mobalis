-- MOBALIS — Row Level Security (migration 0002)
-- Prérequis : 0001_initial_schema.sql déjà appliquée.
-- Déjà appliquée en production — voir supabase/migrations/README.md.
-- Inclut les correctifs de récursion infinie exercices<->assignations et
-- assignations<->assignation_eleves, découverts en testant les inserts.

-- ============================================================
-- HELPERS (security definer : contournent RLS pour se résoudre eux-mêmes,
-- sinon boucle infinie en cherchant l'id de l'utilisateur courant)
-- ============================================================
create function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create function current_eleve_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from eleves where user_id = auth.uid();
$$;

create function current_repetiteur_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from repetiteurs where user_id = auth.uid();
$$;

create function current_parent_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from parents where user_id = auth.uid();
$$;

create function is_eleve_of_repetiteur(target uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from eleve_repetiteurs
    where eleve_id = target and repetiteur_id = current_repetiteur_id()
  );
$$;

-- exercices <-> assignations <-> assignation_eleves cross-reference each
-- other in the "select_parent"/"select_eleve" policies below. Without these
-- security-definer breaks, Postgres detects infinite recursion evaluating
-- them (found by actually running inserts against the seeded schema).
create function is_exercice_assigned_to_eleve(target_exercice uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    join assignation_eleves ae on ae.assignation_id = a.id
    where a.exercice_id = target_exercice and ae.eleve_id = current_eleve_id()
  );
$$;

create function is_exercice_assigned_to_parent(target_exercice uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    join assignation_eleves ae on ae.assignation_id = a.id
    where a.exercice_id = target_exercice and is_eleve_of_parent(ae.eleve_id)
  );
$$;

create function is_assignation_non_diagnostic(target_assignation uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    join exercices e on e.id = a.exercice_id
    where a.id = target_assignation and e.type != 'diagnostic'
  );
$$;

create function is_assignation_of_eleve(target_assignation uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignation_eleves ae
    where ae.assignation_id = target_assignation and ae.eleve_id = current_eleve_id()
  );
$$;

create function is_assignation_of_parent(target_assignation uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignation_eleves ae
    where ae.assignation_id = target_assignation and is_eleve_of_parent(ae.eleve_id)
  );
$$;

create function is_assignation_owned_by_repetiteur(target_assignation uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    where a.id = target_assignation and a.repetiteur_assignant_id = current_repetiteur_id()
  );
$$;

create function is_eleve_of_parent(target uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from eleve_parents
    where eleve_id = target and parent_id = current_parent_id()
  );
$$;

-- Seule façon pour un élève de modifier son propre profil : jamais classe/
-- serie/statut_compte (contrôle admin exclusif, §1.3 du doc de spec).
create function update_style_apprentissage(nouveau_style text) returns void
language sql security definer set search_path = public as $$
  update eleves set style_apprentissage = nouveau_style where id = current_eleve_id();
$$;

-- ============================================================
-- ACTIVATION RLS (toutes les tables)
-- ============================================================
alter table matieres enable row level security;
alter table admins enable row level security;
alter table repetiteurs enable row level security;
alter table repetiteur_matieres enable row level security;
alter table parents enable row level security;
alter table eleves enable row level security;
alter table eleve_parents enable row level security;
alter table eleve_repetiteurs enable row level security;
alter table eleve_matieres enable row level security;
alter table seances enable row level security;
alter table evaluations enable row level security;
alter table paiements enable row level security;
alter table exercices enable row level security;
alter table assignations enable row level security;
alter table assignation_eleves enable row level security;
alter table soumissions enable row level security;
alter table ressources enable row level security;
alter table messages enable row level security;
alter table demandes_aide enable row level security;
alter table badges enable row level security;
alter table badges_obtenus enable row level security;
alter table objectifs enable row level security;
alter table auto_evaluations enable row level security;
alter table bulletins enable row level security;
alter table bulletin_moyennes enable row level security;
alter table passages_classe enable row level security;
alter table suggestions_reorientation enable row level security;
alter table resultats_bac enable row level security;

-- ============================================================
-- MATIÈRES — lecture ouverte à tout authentifié, écriture admin only
-- ============================================================
create policy "matieres_select" on matieres for select to authenticated using (true);
create policy "matieres_admin_write" on matieres for all to authenticated
  using (is_admin()) with check (is_admin());

-- ============================================================
-- ADMINS
-- ============================================================
create policy "admins_self_select" on admins for select to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- RÉPÉTITEURS
-- ============================================================
create policy "repetiteurs_admin_all" on repetiteurs for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "repetiteurs_self_select" on repetiteurs for select to authenticated
  using (user_id = auth.uid());
create policy "repetiteurs_self_update" on repetiteurs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- élève/parent voient le nom du répétiteur qui suit leur enfant
create policy "repetiteurs_visible_to_their_eleves" on repetiteurs for select to authenticated
  using (is_eleve_of_repetiteur(current_eleve_id()));

create policy "repetiteur_matieres_select" on repetiteur_matieres for select to authenticated using (true);
create policy "repetiteur_matieres_admin_write" on repetiteur_matieres for all to authenticated
  using (is_admin()) with check (is_admin());

-- ============================================================
-- PARENTS
-- ============================================================
create policy "parents_admin_all" on parents for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "parents_self_select" on parents for select to authenticated
  using (user_id = auth.uid());
-- préférences de notification (§2.3) modifiables par le parent lui-même
create policy "parents_self_update" on parents for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- ÉLÈVES
-- ============================================================
create policy "eleves_admin_all" on eleves for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "eleves_self_select" on eleves for select to authenticated
  using (user_id = auth.uid());
create policy "eleves_visible_to_repetiteur" on eleves for select to authenticated
  using (is_eleve_of_repetiteur(id));
create policy "eleves_visible_to_parent" on eleves for select to authenticated
  using (is_eleve_of_parent(id));
-- pas de policy update pour l'élève : toute modif de classe/serie/statut_compte
-- passe par l'admin (is_admin ci-dessus) ou la fonction update_style_apprentissage().

create policy "eleve_parents_select" on eleve_parents for select to authenticated
  using (parent_id = current_parent_id() or eleve_id = current_eleve_id() or is_admin());
create policy "eleve_parents_admin_write" on eleve_parents for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "eleve_repetiteurs_select" on eleve_repetiteurs for select to authenticated
  using (repetiteur_id = current_repetiteur_id() or eleve_id = current_eleve_id() or is_admin());
create policy "eleve_repetiteurs_admin_write" on eleve_repetiteurs for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "eleve_matieres_select" on eleve_matieres for select to authenticated
  using (eleve_id = current_eleve_id() or is_eleve_of_repetiteur(eleve_id)
         or is_eleve_of_parent(eleve_id) or is_admin());
create policy "eleve_matieres_admin_write" on eleve_matieres for all to authenticated
  using (is_admin()) with check (is_admin());

-- ============================================================
-- SÉANCES (cahier de texte)
-- ============================================================
create policy "seances_admin_all" on seances for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "seances_repetiteur_all" on seances for all to authenticated
  using (repetiteur_id = current_repetiteur_id()) with check (repetiteur_id = current_repetiteur_id());
create policy "seances_select_eleve" on seances for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "seances_select_parent" on seances for select to authenticated
  using (is_eleve_of_parent(eleve_id));

-- ============================================================
-- ÉVALUATIONS (notes & remarques)
-- ============================================================
create policy "evaluations_admin_all" on evaluations for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "evaluations_repetiteur_all" on evaluations for all to authenticated
  using (repetiteur_id = current_repetiteur_id()) with check (repetiteur_id = current_repetiteur_id());
create policy "evaluations_select_eleve" on evaluations for select to authenticated
  using (eleve_id = current_eleve_id() and visible_eleve = true);
create policy "evaluations_select_parent" on evaluations for select to authenticated
  using (is_eleve_of_parent(eleve_id) and visible_eleve = true);

-- ============================================================
-- PAIEMENTS
-- ============================================================
create policy "paiements_admin_all" on paiements for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "paiements_select_parent" on paiements for select to authenticated
  using (parent_id = current_parent_id());

-- ============================================================
-- EXERCICES
-- ============================================================
create policy "exercices_admin_all" on exercices for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "exercices_repetiteur_all" on exercices for all to authenticated
  using (createur_id = current_repetiteur_id()) with check (createur_id = current_repetiteur_id());
create policy "exercices_repetiteur_select_bibliotheque" on exercices for select to authenticated
  using (dans_bibliotheque = true and current_repetiteur_id() is not null);
-- élève/parent : uniquement les exercices qui leur ont été effectivement assignés
create policy "exercices_select_eleve" on exercices for select to authenticated
  using (is_exercice_assigned_to_eleve(id));
create policy "exercices_select_parent" on exercices for select to authenticated
  using (type != 'diagnostic' and is_exercice_assigned_to_parent(id));

-- ============================================================
-- ASSIGNATIONS
-- ============================================================
create policy "assignations_admin_all" on assignations for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "assignations_repetiteur_all" on assignations for all to authenticated
  using (repetiteur_assignant_id = current_repetiteur_id())
  with check (repetiteur_assignant_id = current_repetiteur_id());
create policy "assignations_select_eleve" on assignations for select to authenticated
  using (is_assignation_of_eleve(id));
-- diagnostic exclu côté parent (§2.2/§3.3)
create policy "assignations_select_parent" on assignations for select to authenticated
  using (is_assignation_of_parent(id) and is_assignation_non_diagnostic(id));

create policy "assignation_eleves_admin_all" on assignation_eleves for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "assignation_eleves_repetiteur_all" on assignation_eleves for all to authenticated
  using (is_assignation_owned_by_repetiteur(assignation_id))
  with check (is_assignation_owned_by_repetiteur(assignation_id));
create policy "assignation_eleves_select_eleve" on assignation_eleves for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "assignation_eleves_select_parent" on assignation_eleves for select to authenticated
  using (is_eleve_of_parent(eleve_id));

-- ============================================================
-- SOUMISSIONS
-- ============================================================
create policy "soumissions_admin_all" on soumissions for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "soumissions_repetiteur_all" on soumissions for all to authenticated
  using (is_assignation_owned_by_repetiteur(assignation_id))
  with check (is_assignation_owned_by_repetiteur(assignation_id));
create policy "soumissions_eleve_select" on soumissions for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "soumissions_eleve_insert" on soumissions for insert to authenticated
  with check (eleve_id = current_eleve_id());
create policy "soumissions_select_parent" on soumissions for select to authenticated
  using (is_eleve_of_parent(eleve_id) and is_assignation_non_diagnostic(assignation_id));

-- ============================================================
-- RESSOURCES (fiches/résumés/corrections partagées)
-- ============================================================
create policy "ressources_select" on ressources for select to authenticated using (true);
create policy "ressources_write" on ressources for all to authenticated
  using (is_admin() or current_repetiteur_id() is not null)
  with check (is_admin() or current_repetiteur_id() is not null);

-- ============================================================
-- MESSAGERIE (élève ↔ répétiteur uniquement — pas le parent, §3.2)
-- ============================================================
create policy "messages_admin_all" on messages for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "messages_repetiteur_all" on messages for all to authenticated
  using (repetiteur_id = current_repetiteur_id()) with check (repetiteur_id = current_repetiteur_id());
create policy "messages_eleve_all" on messages for all to authenticated
  using (eleve_id = current_eleve_id()) with check (eleve_id = current_eleve_id());

-- ============================================================
-- DEMANDES D'AIDE
-- ============================================================
create policy "demandes_aide_admin_all" on demandes_aide for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "demandes_aide_eleve_all" on demandes_aide for all to authenticated
  using (eleve_id = current_eleve_id()) with check (eleve_id = current_eleve_id());
create policy "demandes_aide_repetiteur_select" on demandes_aide for select to authenticated
  using (is_eleve_of_repetiteur(eleve_id));

-- ============================================================
-- BADGES
-- ============================================================
create policy "badges_select" on badges for select to authenticated using (true);
create policy "badges_admin_write" on badges for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "badges_obtenus_select_eleve" on badges_obtenus for select to authenticated
  using (eleve_id = current_eleve_id() or is_eleve_of_parent(eleve_id) or is_admin());
create policy "badges_obtenus_write" on badges_obtenus for all to authenticated
  using (is_admin() or is_eleve_of_repetiteur(eleve_id))
  with check (is_admin() or is_eleve_of_repetiteur(eleve_id));

-- ============================================================
-- OBJECTIFS
-- ============================================================
create policy "objectifs_admin_all" on objectifs for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "objectifs_repetiteur_all" on objectifs for all to authenticated
  using (repetiteur_id = current_repetiteur_id()) with check (repetiteur_id = current_repetiteur_id());
create policy "objectifs_select_eleve" on objectifs for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "objectifs_select_parent" on objectifs for select to authenticated
  using (is_eleve_of_parent(eleve_id));

-- ============================================================
-- AUTO-ÉVALUATIONS
-- ============================================================
create policy "auto_evaluations_admin_all" on auto_evaluations for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "auto_evaluations_eleve_all" on auto_evaluations for all to authenticated
  using (eleve_id = current_eleve_id()) with check (eleve_id = current_eleve_id());
create policy "auto_evaluations_repetiteur_select" on auto_evaluations for select to authenticated
  using (is_eleve_of_repetiteur(eleve_id));

-- ============================================================
-- BULLETINS
-- ============================================================
create policy "bulletins_admin_all" on bulletins for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "bulletins_select_eleve" on bulletins for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "bulletins_select_parent" on bulletins for select to authenticated
  using (is_eleve_of_parent(eleve_id));

create policy "bulletin_moyennes_admin_all" on bulletin_moyennes for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "bulletin_moyennes_select" on bulletin_moyennes for select to authenticated
  using (exists (
    select 1 from bulletins b where b.id = bulletin_id
    and (b.eleve_id = current_eleve_id() or is_eleve_of_parent(b.eleve_id))
  ));

-- ============================================================
-- PASSAGE DE CLASSE
-- ============================================================
create policy "passages_classe_admin_all" on passages_classe for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "passages_classe_select_eleve" on passages_classe for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "passages_classe_select_parent" on passages_classe for select to authenticated
  using (is_eleve_of_parent(eleve_id));

-- ============================================================
-- SUGGESTIONS DE RÉORIENTATION (admin-only tant que non transmise, §2.4)
-- ============================================================
create policy "suggestions_reorientation_admin_all" on suggestions_reorientation for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "suggestions_reorientation_select_parent" on suggestions_reorientation for select to authenticated
  using (transmise_au_parent = true and is_eleve_of_parent(eleve_id));

-- ============================================================
-- RÉSULTAT BAC
-- ============================================================
create policy "resultats_bac_admin_all" on resultats_bac for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "resultats_bac_select_eleve" on resultats_bac for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "resultats_bac_select_parent" on resultats_bac for select to authenticated
  using (is_eleve_of_parent(eleve_id));
