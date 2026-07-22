-- MOBALIS — respecte enfin pref_notif_frequence (migration 0029, audit #16)
-- `parents.pref_notif_frequence` ('immediat'/'hebdomadaire') était stocké et
-- modifiable depuis les réglages, mais envoyer_notifications_en_attente()
-- (le seul point d'envoi, mocké — migration 0008) flushait TOUT ce qui
-- était en_attente pour le centre sans jamais regarder ce champ : un parent
-- ayant choisi "hebdomadaire" recevait ses notifications au même rythme que
-- tout le monde.
--
-- Le déclenchement reste manuel (admin) tant que l'envoi est mocké — pas de
-- vrai cron ici. Le correctif rend la préférence effective dans ce cadre :
-- un parent "immediat" est flushé à chaque envoi ; un parent "hebdomadaire"
-- seulement une fois sa notification la plus ancienne en attente depuis 7
-- jours, ce qui donne une vraie cadence hebdomadaire même avec un
-- déclenchement fréquent côté admin.
create or replace function envoyer_notifications_en_attente() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not is_admin() then
    raise exception 'Réservé à l''administration.';
  end if;
  update notifications n
  set statut = 'envoye_mock', envoye_at = now()
  from parents p
  where n.parent_id = p.id
    and n.centre_id = current_centre_id()
    and n.statut = 'en_attente'
    and (p.pref_notif_frequence = 'immediat' or n.created_at <= now() - interval '7 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
