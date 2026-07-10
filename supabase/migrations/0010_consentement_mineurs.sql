-- MOBALIS — consentement RGPD-like pour les données de mineurs (migration 0010)
-- Prérequis : 0002 (RLS) appliquée — la policy "parents_self_update" existante
-- couvre déjà cette nouvelle colonne, aucune policy supplémentaire nécessaire.

alter table parents add column consentement_accepte_at timestamptz;
