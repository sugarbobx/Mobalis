-- MOBALIS — défis QCM gamifiés + classements hebdomadaires (migration 0005)
-- Prérequis : 0004_multi_tenancy.sql appliquée.
--
-- Principe anti-triche : un élève n'accède JAMAIS aux lignes `defis`
-- directement (le jsonb `questions` contient bonneReponseIndex). Tout passe
-- par des RPC security definer : liste sans réponses, questions sans
-- réponses, scoring 100 % côté serveur, une seule tentative par défi.

-- ============================================================
-- 1. TABLES
-- ============================================================
create table defis (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) default current_centre_id(),
  matiere_id uuid not null references matieres(id),
  classe classe_eleve not null, -- le défi cible une classe (2nde/1ere/tle)
  titre text not null,
  questions jsonb not null, -- copie figée : [{question, choix[], bonneReponseIndex}]
  points_base int not null default 100,
  date_debut date not null,
  date_fin date not null,
  created_by uuid, -- repetiteurs.id ou admins.id (polymorphe, comme exercices)
  created_at timestamptz not null default now(),
  check (date_fin >= date_debut)
);

create table defi_participations (
  defi_id uuid references defis(id) on delete cascade,
  eleve_id uuid references eleves(id) on delete cascade,
  reponses int[] not null,
  score int not null check (score between 0 and 100),
  points int not null,
  temps_secondes int not null,
  created_at timestamptz not null default now(),
  primary key (defi_id, eleve_id) -- une seule tentative
);

create index on defis (centre_id, classe, date_debut);
create index on defi_participations (eleve_id);

-- ============================================================
-- 2. RLS — staff uniquement en direct ; les élèves passent par les RPC
-- ============================================================
alter table defis enable row level security;
alter table defi_participations enable row level security;

create policy "defis_staff_all" on defis for all to authenticated
  using (centre_id = current_centre_id() and (is_admin() or current_repetiteur_id() is not null))
  with check (centre_id = current_centre_id() and (is_admin() or current_repetiteur_id() is not null));
-- volontairement AUCUNE policy select élève : les questions contiennent les réponses.

create policy "participations_select_self" on defi_participations for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "participations_select_staff" on defi_participations for select to authenticated
  using ((is_admin() or current_repetiteur_id() is not null) and eleve_in_my_centre(eleve_id));
-- volontairement AUCUNE policy insert : seul soumettre_defi() (security definer) écrit.

-- ============================================================
-- 3. RPC ÉLÈVE
-- ============================================================

-- Liste des défis de ma classe/mon centre, sans le jsonb questions.
create function get_defis_eleve() returns table (
  id uuid,
  titre text,
  matiere_id uuid,
  points_base int,
  date_debut date,
  date_fin date,
  nb_questions int,
  score int,
  points int
)
language sql security definer stable set search_path = public as $$
  select d.id, d.titre, d.matiere_id, d.points_base, d.date_debut, d.date_fin,
         jsonb_array_length(d.questions)::int,
         p.score, p.points
  from defis d
  left join defi_participations p
    on p.defi_id = d.id and p.eleve_id = current_eleve_id()
  where d.centre_id = current_centre_id()
    and d.classe = (select e.classe from eleves e where e.id = current_eleve_id())
  order by d.date_debut desc, d.created_at desc;
$$;

-- Questions d'un défi jouable, SANS bonneReponseIndex.
create function get_defi_questions(p_defi_id uuid) returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_agg(jsonb_build_object('question', t.q->>'question', 'choix', t.q->'choix') order by t.ord)
  from defis d,
       jsonb_array_elements(d.questions) with ordinality t(q, ord)
  where d.id = p_defi_id
    and d.centre_id = current_centre_id()
    and d.classe = (select e.classe from eleves e where e.id = current_eleve_id())
    and current_date between d.date_debut and d.date_fin
    and not exists (select 1 from defi_participations p
                    where p.defi_id = d.id and p.eleve_id = current_eleve_id());
$$;

-- Soumission : validations + scoring serveur + insert, tout en un.
create function soumettre_defi(p_defi_id uuid, p_reponses int[], p_temps_secondes int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_defi defis%rowtype;
  v_eleve_id uuid := current_eleve_id();
  v_nb int;
  v_bonnes int := 0;
  v_score int;
  v_bonus int := 0;
  v_points int;
  i int;
begin
  if v_eleve_id is null then
    raise exception 'Réservé aux élèves.';
  end if;
  select * into v_defi from defis where id = p_defi_id;
  if v_defi.id is null
     or v_defi.centre_id is distinct from current_centre_id()
     or v_defi.classe is distinct from (select e.classe from eleves e where e.id = v_eleve_id) then
    raise exception 'Défi introuvable.';
  end if;
  if current_date < v_defi.date_debut or current_date > v_defi.date_fin then
    raise exception 'Ce défi est fermé.';
  end if;
  if exists (select 1 from defi_participations where defi_id = p_defi_id and eleve_id = v_eleve_id) then
    raise exception 'Tu as déjà joué ce défi.';
  end if;

  v_nb := jsonb_array_length(v_defi.questions);
  if coalesce(array_length(p_reponses, 1), 0) <> v_nb then
    raise exception 'Nombre de réponses invalide.';
  end if;

  for i in 0..(v_nb - 1) loop
    if (v_defi.questions->i->>'bonneReponseIndex')::int = p_reponses[i + 1] then
      v_bonnes := v_bonnes + 1;
    end if;
  end loop;
  v_score := round(100.0 * v_bonnes / v_nb);

  -- Bonus rapidité : jusqu'à 20 pts, budget 30 s/question, seulement si
  -- score >= 50 (sinon spammer des réponses au hasard rapporterait des points).
  if v_score >= 50 then
    v_bonus := greatest(0, round(20.0 * (1 - least(p_temps_secondes, v_nb * 30)::numeric / (v_nb * 30))))::int;
  end if;
  v_points := round(v_defi.points_base * v_score / 100.0)::int + v_bonus;

  insert into defi_participations (defi_id, eleve_id, reponses, score, points, temps_secondes)
  values (p_defi_id, v_eleve_id, p_reponses, v_score, v_points, greatest(p_temps_secondes, 0));

  -- Les bonnes réponses ne sont révélées qu'ici, après enregistrement.
  return jsonb_build_object(
    'score', v_score,
    'points', v_points,
    'bonus', v_bonus,
    'corrections', (select jsonb_agg((t.q->>'bonneReponseIndex')::int order by t.ord)
                    from jsonb_array_elements(v_defi.questions) with ordinality t(q, ord))
  );
end;
$$;

-- Classement hebdomadaire (lundi → dimanche). p_scope : 'classe' | 'centre'.
-- Renvoie le top 10 + la ligne de l'appelant même hors top 10.
-- Prénom + initiale du nom uniquement (élèves mineurs).
create function get_classement(p_scope text, p_semaine date)
returns table (
  rang bigint,
  eleve_id uuid,
  prenom text,
  nom_initiale text,
  classe classe_eleve,
  total_points bigint,
  est_moi boolean
)
language sql security definer stable set search_path = public as $$
  with moi as (
    select e.id, e.classe, e.centre_id from eleves e where e.id = current_eleve_id()
  ),
  lundi as (
    select date_trunc('week', p_semaine::timestamp)::date as jour
  ),
  points_semaine as (
    select p.eleve_id, sum(p.points) as total_points
    from defi_participations p
    join defis d on d.id = p.defi_id
    join eleves e on e.id = p.eleve_id
    where d.centre_id = (select centre_id from moi)
      and (p_scope = 'centre' or e.classe = (select classe from moi))
      and p.created_at >= (select jour from lundi)
      and p.created_at < (select jour from lundi) + interval '7 days'
    group by p.eleve_id
  ),
  classement as (
    select rank() over (order by ps.total_points desc) as rang,
           ps.eleve_id,
           e.prenom,
           left(e.nom, 1) || '.' as nom_initiale,
           e.classe,
           ps.total_points,
           (ps.eleve_id = (select id from moi)) as est_moi
    from points_semaine ps
    join eleves e on e.id = ps.eleve_id
  )
  select * from classement c where c.rang <= 10 or c.est_moi order by c.rang;
$$;
