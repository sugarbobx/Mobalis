-- MOBALIS — correctifs secondaires audit logique applicative (migration 0032)

-- ============================================================
-- Paiement mock sans verrou (condition de course sur double-clic/retry) —
-- deux appels concurrents pouvaient tous les deux lire statut != 'paye'
-- avant que le premier n'ait écrit, générant deux références de transaction
-- mock pour la même facture. `for update` sérialise sur la ligne.
-- ============================================================
create or replace function confirmer_paiement_mock(p_paiement_id uuid, p_methode text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_paiement paiements%rowtype;
  v_reference text;
begin
  if p_methode not in ('mtn', 'orange') then
    raise exception 'Méthode de paiement invalide.';
  end if;
  select * into v_paiement from paiements where id = p_paiement_id for update;
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

-- ============================================================
-- Aucune contrainte n'empêchait deux défis hebdo dupliqués pour la même
-- matière/classe/semaine dans un même centre (deux répétiteurs pouvaient
-- créer le même défi en parallèle). Index unique partiel, scopé par centre
-- (deux centres différents doivent pouvoir avoir chacun leur propre défi
-- hebdo pour la même matière/classe/semaine, sans collision). Mensuel a
-- matiere_id null et n'est pas concerné par cette contrainte.
-- ============================================================
create unique index defis_hebdo_unique_centre_matiere_classe_semaine
  on defis (centre_id, matiere_id, classe, date_debut)
  where type = 'hebdo';
