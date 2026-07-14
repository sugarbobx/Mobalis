-- MOBALIS — correctif RLS banque de QCM (migration 0023)
-- Bug réel trouvé par vérification e2e : la policy exercices_select_global
-- (migration 0022) ne filtrait que sur centre_id IS NULL, sans tenir compte
-- de `statut` — un élève authentifié pouvait lire du contenu encore
-- `brouillon`, cassant le seul filet de sécurité voulu ("jamais visible aux
-- élèves tant que ce n'est pas passé en publié"). Admin/tuteur gardent
-- accès à tout (y compris brouillon) pour la review.

drop policy "exercices_select_global" on exercices;
create policy "exercices_select_global" on exercices for select to authenticated
  using (
    centre_id is null
    and (statut = 'publie' or is_admin() or current_repetiteur_id() is not null)
  );

drop policy "exercice_choix_select_global" on exercice_choix;
create policy "exercice_choix_select_global" on exercice_choix for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (e.statut = 'publie' or is_admin() or current_repetiteur_id() is not null)
  ));

drop policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie;
create policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (e.statut = 'publie' or is_admin() or current_repetiteur_id() is not null)
  ));
