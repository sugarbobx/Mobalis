-- MOBALIS — centre + admin créés seulement après confirmation email réelle
-- (migration 0028, audit item #7)
--
-- Avant : app/inscription/actions.ts créait centre + admin juste après
-- supabase.auth.signUp() côté client, avant toute confirmation. signUp()
-- crée la ligne auth.users immédiatement (même avec confirmation email
-- activée) et renvoie un user id valide — rien n'empêchait quelqu'un de
-- soumettre le formulaire avec l'email de quelqu'un d'autre : le centre et
-- le compte admin se retrouvaient créés et liés à cette adresse avant que
-- son propriétaire réel n'ait jamais rien confirmé.
--
-- Fix : l'inscription self-service stocke désormais son intention dans
-- raw_user_meta_data au moment du signUp() (voir app/inscription/page.tsx),
-- et un trigger sur auth.users ne crée centre + admin qu'au moment où
-- Supabase marque l'email comme réellement confirmé (email_confirmed_at
-- passe de null à non-null) — impossible à déclencher sans avoir cliqué le
-- lien reçu sur la boîte mail correspondante.

create function completer_inscription_centre() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_centre_id uuid;
  v_nom_centre text := new.raw_user_meta_data ->> 'pending_centre_nom';
  v_ville text := new.raw_user_meta_data ->> 'pending_centre_ville';
  v_nom_admin text := new.raw_user_meta_data ->> 'pending_admin_nom';
  v_prenom_admin text := new.raw_user_meta_data ->> 'pending_admin_prenom';
begin
  -- Pas une inscription self-service en attente (compte créé autrement —
  -- admin/répétiteur/parent/élève invité manuellement) : ne rien faire.
  if v_nom_centre is null then
    return new;
  end if;

  -- Déjà traité, ou ce compte a entretemps reçu un profil par un autre biais
  -- (invitation admin pendant la fenêtre de confirmation) : ne rien refaire.
  if exists (select 1 from admins where user_id = new.id)
    or exists (select 1 from repetiteurs where user_id = new.id)
    or exists (select 1 from parents where user_id = new.id)
    or exists (select 1 from eleves where user_id = new.id) then
    return new;
  end if;

  insert into centres (nom, ville) values (v_nom_centre, nullif(v_ville, ''))
  returning id into v_centre_id;

  insert into admins (user_id, centre_id, nom, prenom)
  values (new.id, v_centre_id, coalesce(v_nom_admin, ''), coalesce(v_prenom_admin, ''));

  return new;
end;
$$;

create trigger trg_completer_inscription_centre
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function completer_inscription_centre();
