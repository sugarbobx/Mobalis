-- MOBALIS — corrige une fuite introduite par la migration 0036 (migration 0037)
--
-- Bug trouvé par vérification e2e juste après application de 0036 : la
-- clause `statut = 'publie'` (héritée telle quelle de 0023, pensée pour les
-- élèves) n'a aucune restriction de rôle — dès qu'un QCM passe en publié
-- (état normal une fois poussé vers un défi), TOUT utilisateur authentifié
-- peut le lire, y compris un répétiteur d'une AUTRE matière. Le scoping
-- ajouté en 0036 ne protégeait donc que le brouillon, pas le publié — raté
-- l'essentiel du cas d'usage (la banque QCM tourne justement autour de
-- contenu publié).
--
-- Fix : la clause "publié = visible" ne s'applique plus qu'à qui n'est ni
-- admin ni répétiteur (élève/parent) — comportement élève inchangé (déjà
-- noté comme non-scopé par matière/classe, hors sujet ici). Un répétiteur
-- ne voit désormais que les QCM (brouillon ou publié) de ses propres
-- matières, plus jamais via la branche "publié".

drop policy "exercices_select_global" on exercices;
create policy "exercices_select_global" on exercices for select to authenticated
  using (
    centre_id is null
    and (
      is_admin()
      or exists (
        select 1 from repetiteur_matieres rm
        where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = exercices.matiere_id
      )
      or (statut = 'publie' and current_repetiteur_id() is null)
    )
  );

drop policy "exercice_choix_select_global" on exercice_choix;
create policy "exercice_choix_select_global" on exercice_choix for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (
        is_admin()
        or exists (
          select 1 from repetiteur_matieres rm
          where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = e.matiere_id
        )
        or (e.statut = 'publie' and current_repetiteur_id() is null)
      )
  ));

drop policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie;
create policy "exercice_difficulte_serie_select_global" on exercice_difficulte_serie for select to authenticated
  using (exists (
    select 1 from exercices e
    where e.id = exercice_id and e.centre_id is null
      and (
        is_admin()
        or exists (
          select 1 from repetiteur_matieres rm
          where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = e.matiere_id
        )
        or (e.statut = 'publie' and current_repetiteur_id() is null)
      )
  ));
