-- MOBALIS — correctifs audit logique applicative (migration 0026)
-- 6 failles RLS confirmées par revue de code (AUDIT_LOGIQUE_APPLICATION.md,
-- items #1, #2, #3, #5, #6, #9). Toutes corrigées au niveau schéma, pas
-- seulement UI — même doctrine que les migrations 0024/0025.

-- ============================================================
-- #1 — fuite cross-tenant via exercice assigné : une assignation pouvait
-- référencer un exercice_id d'un AUTRE centre (aucun check à l'insert), et
-- is_exercice_assigned_to_eleve() ne vérifiait jamais le centre de
-- l'exercice. Un répétiteur du Centre A assignant un exercice_id du Centre B
-- donnait à ses élèves un accès en lecture à ce contenu étranger.
-- Fix double : la fonction re-vérifie désormais le centre, ET l'insert
-- d'assignation est bloqué à la source si l'exercice n'est pas du centre.
-- ============================================================
create or replace function is_exercice_assigned_to_eleve(target_exercice uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    join assignation_eleves ae on ae.assignation_id = a.id
    join exercices e on e.id = a.exercice_id
    where a.exercice_id = target_exercice
      and ae.eleve_id = current_eleve_id()
      and e.centre_id = current_centre_id()
  );
$$;

create or replace function is_exercice_assigned_to_parent(target_exercice uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assignations a
    join assignation_eleves ae on ae.assignation_id = a.id
    join exercices e on e.id = a.exercice_id
    where a.exercice_id = target_exercice
      and is_eleve_of_parent(ae.eleve_id)
      and e.centre_id = current_centre_id()
  );
$$;

drop policy "assignations_repetiteur_all" on assignations;
create policy "assignations_repetiteur_all" on assignations for all to authenticated
  using (repetiteur_assignant_id = current_repetiteur_id())
  with check (
    repetiteur_assignant_id = current_repetiteur_id()
    and exists (select 1 from exercices e where e.id = exercice_id and e.centre_id = current_centre_id())
  );

-- ============================================================
-- #9 — repetiteurs_visible_to_their_eleves comparait le mauvais champ
-- (is_eleve_of_repetiteur(current_eleve_id()) vaut toujours faux : ça teste
-- "current_eleve_id() est-il élève du répétiteur courant", alors qu'une
-- session élève n'a jamais de current_repetiteur_id()). RLS bloquait donc
-- silencieusement tout accès élève/parent aux infos de leur répétiteur —
-- et aucune policy parent n'existait du tout.
-- Nouvelle fonction dans le bon sens : "la ligne repetiteurs lue (target)
-- a-t-elle current_eleve_id() parmi ses élèves ?". Réutilisée aussi pour
-- la messagerie (#2 ci-dessous).
-- ============================================================
create function repetiteur_has_eleve(target_repetiteur uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from eleve_repetiteurs
    where repetiteur_id = target_repetiteur and eleve_id = current_eleve_id()
  );
$$;

drop policy "repetiteurs_visible_to_their_eleves" on repetiteurs;
create policy "repetiteurs_visible_to_their_eleves" on repetiteurs for select to authenticated
  using (repetiteur_has_eleve(id));

create policy "repetiteurs_visible_to_their_parents" on repetiteurs for select to authenticated
  using (exists (
    select 1 from eleve_repetiteurs er
    join eleve_parents ep on ep.eleve_id = er.eleve_id
    where er.repetiteur_id = repetiteurs.id and ep.parent_id = current_parent_id()
  ));

-- ============================================================
-- #2 — messagerie cross-tenant : messages_eleve_all vérifiait seulement
-- eleve_id = current_eleve_id(), jamais que repetiteur_id ciblé est
-- réellement un tuteur de cet élève. Un élève pouvait écrire à/lire
-- n'importe quel répétiteur, y compris d'un autre centre.
-- ============================================================
drop policy "messages_eleve_all" on messages;
create policy "messages_eleve_all" on messages for all to authenticated
  using (eleve_id = current_eleve_id() and repetiteur_has_eleve(repetiteur_id))
  with check (eleve_id = current_eleve_id() and repetiteur_has_eleve(repetiteur_id));

-- ============================================================
-- #3 — notifications_select_staff n'avait aucun filtre par élèves assignés :
-- tout répétiteur lisait les notifications de TOUTES les familles du centre.
-- Admin garde l'accès centre entier, répétiteur restreint à ses élèves.
-- Même bug dans le RPC get_notifications_centre().
-- ============================================================
drop policy "notifications_select_staff" on notifications;
create policy "notifications_select_staff" on notifications for select to authenticated
  using (
    (is_admin() and centre_id = current_centre_id())
    or (current_repetiteur_id() is not null and is_eleve_of_repetiteur(eleve_id))
  );

create or replace function get_notifications_centre() returns table (
  id uuid, type notification_type, canal text, contenu text,
  statut notification_statut, created_at timestamptz, envoye_at timestamptz,
  eleve_prenom text, eleve_nom text
)
language sql security definer stable set search_path = public as $$
  select n.id, n.type, n.canal, n.contenu, n.statut, n.created_at, n.envoye_at,
         e.prenom, e.nom
  from notifications n
  join eleves e on e.id = n.eleve_id
  where n.centre_id = current_centre_id()
    and (is_admin() or (current_repetiteur_id() is not null and is_eleve_of_repetiteur(n.eleve_id)))
  order by n.created_at desc
  limit 200;
$$;

-- ============================================================
-- #5 — soumissions_eleve_insert ne vérifiait jamais que l'assignation_id
-- appartient bien à l'élève : insertion possible sur n'importe quel devoir.
-- ============================================================
drop policy "soumissions_eleve_insert" on soumissions;
create policy "soumissions_eleve_insert" on soumissions for insert to authenticated
  with check (eleve_id = current_eleve_id() and is_assignation_of_eleve(assignation_id));

-- ============================================================
-- #6 — bulletin PDF : décision produit "seul le parent télécharge" (migration
-- 0016) n'avait été appliquée qu'au RPC get_bulletin_sequence, jamais à la
-- policy Storage/metadata correspondante. Un élève connaissant son propre
-- chemin de fichier pouvait toujours le télécharger en direct.
-- ============================================================
drop policy "bulletin_pdfs_select_eleve" on bulletin_pdfs;
drop policy "bulletin_storage_select_eleve" on storage.objects;
