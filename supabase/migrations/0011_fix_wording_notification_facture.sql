-- MOBALIS — corrige le texte de la notification à la création d'une facture
-- (migration 0011). Trouvé en testant le nouveau flux de facturation (0009) :
-- notifier_paiement() (0008) disait "Paiement enregistré" dès la CRÉATION
-- d'une facture en_attente — trompeur, on dirait que c'est déjà payé. La
-- confirmation réelle a son propre message depuis 0009
-- (notifier_paiement_confirme, sur le passage à 'paye').

create or replace function notifier_paiement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_pref boolean;
begin
  select * into v_eleve from eleves where id = new.eleve_id;
  select pref_notif_paiements into v_pref from parents where id = new.parent_id;
  if v_pref then
    insert into notifications (centre_id, parent_id, eleve_id, type, contenu)
    values (
      v_eleve.centre_id, new.parent_id, new.eleve_id, 'paiement',
      case new.statut
        when 'en_retard' then format('Paiement en retard pour %s : %s FCFA (%s)', v_eleve.prenom, new.montant, new.motif)
        when 'paye' then format('Paiement enregistré pour %s : %s FCFA (%s)', v_eleve.prenom, new.montant, new.motif)
        else format('Nouvelle facture pour %s : %s FCFA (%s)', v_eleve.prenom, new.montant, new.motif)
      end
    );
  end if;
  return new;
end;
$$;
