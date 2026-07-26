-- MOBALIS — resserre la lecture de la banque QCM par répétiteur à ses matières (migration 0036)
--
-- Avant cette migration, exercices_select_global / exercice_choix_select_global /
-- exercice_difficulte_serie_select_global (migration 0023) donnaient à TOUT
-- répétiteur un accès en lecture à TOUTE la banque globale (current_repetiteur_id()
-- is not null, sans filtre matière) — y compris exercice_choix.est_correct.
-- Resté sans conséquence tant qu'aucune UI /tutor/* ne tapait ces tables.
-- Corrigé : un répétiteur ne lit que les QCM des matières qu'il enseigne
-- (repetiteur_matieres, même table que Repetiteur.matiereIds côté client).
-- Admin (is_admin()) et élève (statut = 'publie') inchangés.

drop policy "exercices_select_global" on exercices;
create policy "exercices_select_global" on exercices for select to authenticated
  using (
    centre_id is null
    and (
      statut = 'publie'
      or is_admin()
      or exists (
        select 1 from repetiteur_matieres rm
        where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = exercices.matiere_id
      )
    )
  );

drop policy "exercice_choix_select_global" on exercice_choix;
create policy "exercice_choix_select_global" on exercice_choix for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (
        e.statut = 'publie'
        or is_admin()
        or exists (
          select 1 from repetiteur_matieres rm
          where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = e.matiere_id
        )
      )
  ));

drop policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie;
create policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (
        e.statut = 'publie'
        or is_admin()
        or exists (
          select 1 from repetiteur_matieres rm
          where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = e.matiere_id
        )
      )
  ));
