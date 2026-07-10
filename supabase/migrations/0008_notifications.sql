-- MOBALIS — notifications parents, expéditeur mocké (migration 0008)
-- Prérequis : 0004 (multi-tenancy) appliquée.
--
-- Pipeline complet : déclenchement (triggers) → file d'attente → "envoi".
-- L'envoi est MOCKÉ : envoyer_notifications_en_attente() se contente de
-- marquer les lignes comme envoyées. C'est la SEULE fonction à réécrire le
-- jour où un vrai canal SMS/WhatsApp est budgété — triggers, RLS et UI ne
-- bougent pas.

create type notification_type as enum ('note', 'absence', 'remarque', 'paiement');
create type notification_statut as enum ('en_attente', 'envoye_mock', 'echec');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id),
  parent_id uuid not null references parents(id) on delete cascade,
  eleve_id uuid not null references eleves(id) on delete cascade,
  type notification_type not null,
  canal text not null default 'whatsapp',
  contenu text not null,
  statut notification_statut not null default 'en_attente',
  created_at timestamptz not null default now(),
  envoye_at timestamptz
);

create index on notifications (centre_id, statut);
create index on notifications (parent_id, created_at desc);

alter table notifications enable row level security;
create policy "notifications_select_self" on notifications for select to authenticated
  using (parent_id = current_parent_id());
create policy "notifications_select_staff" on notifications for select to authenticated
  using ((is_admin() or current_repetiteur_id() is not null) and centre_id = current_centre_id());
-- volontairement AUCUNE policy insert/update directe : seuls les triggers
-- (security definer) et envoyer_notifications_en_attente() écrivent.

-- ============================================================
-- DÉCLENCHEURS
-- ============================================================

create function notifier_evaluation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_matiere_nom text;
  v_parent record;
begin
  select * into v_eleve from eleves where id = new.eleve_id;
  select nom into v_matiere_nom from matieres where id = new.matiere_id;

  for v_parent in
    select p.id, p.pref_notif_notes, p.pref_notif_remarques
    from eleve_parents ep join parents p on p.id = ep.parent_id
    where ep.eleve_id = new.eleve_id
  loop
    if new.note is not null and v_parent.pref_notif_notes then
      insert into notifications (centre_id, parent_id, eleve_id, type, contenu)
      values (v_eleve.centre_id, v_parent.id, new.eleve_id, 'note',
              format('%s a reçu une nouvelle note en %s : %s/20', v_eleve.prenom, v_matiere_nom, new.note));
    end if;
    if new.remarque is not null and length(trim(new.remarque)) > 0 and v_parent.pref_notif_remarques then
      insert into notifications (centre_id, parent_id, eleve_id, type, contenu)
      values (v_eleve.centre_id, v_parent.id, new.eleve_id, 'remarque',
              format('Nouvelle remarque du répétiteur pour %s en %s : « %s »', v_eleve.prenom, v_matiere_nom, new.remarque));
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_notifier_evaluation
  after insert on evaluations
  for each row execute function notifier_evaluation();

create function notifier_absence() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_parent record;
begin
  if new.present is distinct from false or old.present is not distinct from new.present then
    return new;
  end if;
  select * into v_eleve from eleves where id = new.eleve_id;
  for v_parent in
    select p.id from eleve_parents ep join parents p on p.id = ep.parent_id
    where ep.eleve_id = new.eleve_id and p.pref_notif_absences
  loop
    insert into notifications (centre_id, parent_id, eleve_id, type, contenu)
    values (v_eleve.centre_id, v_parent.id, new.eleve_id, 'absence',
            format('%s était absent(e) à la séance du %s', v_eleve.prenom, new.date));
  end loop;
  return new;
end;
$$;

create trigger trg_notifier_absence
  after update on seances
  for each row execute function notifier_absence();

create function notifier_paiement() returns trigger
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
        else format('Paiement enregistré pour %s : %s FCFA (%s)', v_eleve.prenom, new.montant, new.motif)
      end
    );
  end if;
  return new;
end;
$$;

create trigger trg_notifier_paiement
  after insert on paiements
  for each row execute function notifier_paiement();

-- ============================================================
-- RPC
-- ============================================================

create function get_mes_notifications() returns table (
  id uuid, type notification_type, canal text, contenu text,
  statut notification_statut, created_at timestamptz, envoye_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select id, type, canal, contenu, statut, created_at, envoye_at
  from notifications
  where parent_id = current_parent_id()
  order by created_at desc
  limit 50;
$$;

create function get_notifications_centre() returns table (
  id uuid, type notification_type, canal text, contenu text,
  statut notification_statut, created_at timestamptz, envoye_at timestamptz,
  eleve_prenom text, eleve_nom text
)
language sql security definer stable set search_path = public as $$
  select n.id, n.type, n.canal, n.contenu, n.statut, n.created_at, n.envoye_at,
         e.prenom, e.nom
  from notifications n
  join eleves e on e.id = n.eleve_id
  where n.centre_id = current_centre_id()
    and (is_admin() or current_repetiteur_id() is not null)
  order by n.created_at desc
  limit 200;
$$;

-- MOCK — remplacer le corps par un vrai appel API (Twilio/Africa's Talking)
-- le jour venu. Triggers, RLS et UI n'ont pas besoin de changer.
create function envoyer_notifications_en_attente() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not is_admin() then
    raise exception 'Réservé à l''administration.';
  end if;
  update notifications
  set statut = 'envoye_mock', envoye_at = now()
  where centre_id = current_centre_id() and statut = 'en_attente';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
