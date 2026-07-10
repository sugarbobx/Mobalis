-- MOBALIS — paiements mobile money, expéditeur mocké (migration 0009)
-- Prérequis : 0008 (notifications) appliquée.
--
-- Même logique que les notifications (0008) : le circuit complet est codé,
-- seul l'appel au fournisseur réel (CinetPay/Flutterwave/NotchPay pour
-- MTN/Orange Money) est mocké. confirmer_paiement_mock() est LA seule
-- fonction à réécrire le jour où un compte marchand existe.

alter table paiements add column methode_paiement text; -- 'mtn' | 'orange' | 'especes' | 'virement'
alter table paiements add column reference_transaction text;

-- ============================================================
-- Notification à la confirmation (complète le trigger AFTER INSERT de
-- 0008, qui ne couvre que la création de la facture, pas son paiement).
-- ============================================================
create function notifier_paiement_confirme() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_pref boolean;
begin
  if new.statut is distinct from 'paye' or old.statut is not distinct from new.statut then
    return new;
  end if;
  select * into v_eleve from eleves where id = new.eleve_id;
  select pref_notif_paiements into v_pref from parents where id = new.parent_id;
  if v_pref then
    insert into notifications (centre_id, parent_id, eleve_id, type, contenu)
    values (v_eleve.centre_id, new.parent_id, new.eleve_id, 'paiement',
            format('Paiement confirmé pour %s : %s FCFA (%s)', v_eleve.prenom, new.montant, new.motif));
  end if;
  return new;
end;
$$;

create trigger trg_notifier_paiement_confirme
  after update on paiements
  for each row execute function notifier_paiement_confirme();

-- ============================================================
-- RPC — confirmation côté parent, écriture restreinte par la fonction
-- elle-même (pas de policy update directe : évite qu'un parent falsifie
-- montant/motif en modifiant la requête HTTP).
-- ============================================================
create function confirmer_paiement_mock(p_paiement_id uuid, p_methode text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_paiement paiements%rowtype;
  v_reference text;
begin
  if p_methode not in ('mtn', 'orange') then
    raise exception 'Méthode de paiement invalide.';
  end if;
  select * into v_paiement from paiements where id = p_paiement_id;
  if v_paiement.id is null or v_paiement.parent_id <> current_parent_id() then
    raise exception 'Facture introuvable.';
  end if;
  if v_paiement.statut = 'paye' then
    raise exception 'Cette facture est déjà réglée.';
  end if;

  v_reference := 'MOCK-' || upper(substr(md5(random()::text), 1, 8));
  update paiements
  set statut = 'paye', methode_paiement = p_methode, reference_transaction = v_reference
  where id = p_paiement_id;

  return jsonb_build_object('reference', v_reference, 'methode', p_methode);
end;
$$;
