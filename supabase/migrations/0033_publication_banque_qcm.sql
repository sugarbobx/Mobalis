-- MOBALIS — flux de publication banque QCM globale (migration 0033)
-- Décision produit actée avec l'utilisateur : n'importe quel admin de centre
-- peut publier/dépublier le contenu global (centre_id IS NULL), pas de rôle
-- super-admin plateforme dédié pour l'instant.
--
-- Avant cette migration, aucune policy d'écriture n'existait sur le contenu
-- global : `exercices_admin_all` exige centre_id = current_centre_id(), ce
-- qui n'est jamais vrai pour une ligne centre_id IS NULL. Les 5000 QCM
-- générés restaient donc tous en statut='brouillon' sans mécanisme pour les
-- publier depuis l'app (RAPPORT_BANQUE_QCM.md, décision "Flux de
-- publication" jamais tranchée jusqu'ici).
--
-- Scope volontairement étroit : update de `statut` uniquement (pas de
-- delete/insert sur le contenu global depuis l'app — ce chantier ne change
-- pas qui peut CRÉER des QCM globaux, seulement qui peut les publier).
create policy "exercices_admin_publie_global" on exercices for update to authenticated
  using (is_admin() and centre_id is null)
  with check (is_admin() and centre_id is null);
