-- 0034 a retiré l'index unique (centre, matiere, classe, date_debut) pour permettre
-- à plusieurs répétiteurs d'avoir chacun leur défi hebdo sur la même matière/classe,
-- `created_by` devenant le champ qui isole les défis de chaque répétiteur (voir
-- get_defis_eleve()/demarrer_defi()). Mais la policy "defis_repetiteur_hebdo" (0006)
-- n'a jamais vérifié `created_by = current_repetiteur_id()` : un répétiteur B qui
-- enseigne la même matière et a un élève dans la même classe pouvait UPDATE/DELETE
-- le défi hebdo du répétiteur A, ou INSERT un défi avec un created_by arbitraire
-- (created_by est un uuid libre, sans FK). Fix : ajoute la vérification d'ownership.

drop policy "defis_repetiteur_hebdo" on defis;

create policy "defis_repetiteur_hebdo" on defis for all to authenticated
  using (
    type = 'hebdo' and centre_id = current_centre_id()
    and created_by = current_repetiteur_id()
    and exists (select 1 from repetiteur_matieres rm
                where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = defis.matiere_id)
    and exists (select 1 from eleve_repetiteurs er join eleves e on e.id = er.eleve_id
                where er.repetiteur_id = current_repetiteur_id() and e.classe = defis.classe)
  )
  with check (
    type = 'hebdo' and centre_id = current_centre_id()
    and created_by = current_repetiteur_id()
    and exists (select 1 from repetiteur_matieres rm
                where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = defis.matiere_id)
    and exists (select 1 from eleve_repetiteurs er join eleves e on e.id = er.eleve_id
                where er.repetiteur_id = current_repetiteur_id() and e.classe = defis.classe)
  );
