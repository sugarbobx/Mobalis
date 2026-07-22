-- MOBALIS — répétiteur peut traiter une demande d'aide (migration 0031,
-- audit item #17). RLS donnait déjà au répétiteur lecture sur messages et
-- demandes_aide de ses élèves + écriture complète sur messages, mais aucune
-- policy update sur demandes_aide (select only) : impossible de marquer une
-- demande "traitée" une fois la nouvelle UI tuteur construite
-- (app/tutor/messages/page.tsx).
create policy "demandes_aide_repetiteur_update" on demandes_aide for update to authenticated
  using (is_eleve_of_repetiteur(eleve_id))
  with check (is_eleve_of_repetiteur(eleve_id));
