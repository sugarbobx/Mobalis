-- MOBALIS — banque de questions + défis v2 (migration 0006)
-- Prérequis : 0005 appliquée. Aucune donnée défis en prod → drop/recreate sûr.
--
-- Changements majeurs vs v1 :
--  * banque de questions centralisée (matière + classe + chapitre), source
--    unique des défis ET de la révision (0007)
--  * chaque élève reçoit un TIRAGE ALÉATOIRE individuel (question_ids figés
--    au démarrage — deux élèves n'ont pas le même questionnaire)
--  * temps mesuré côté serveur (started_at → soumission), plus côté client
--  * deux types de défis : hebdo (répétiteur, sa matière, classement
--    hebdomadaire) et mensuel (admin, toutes les matières du programme de
--    l'élève, classement ANNUEL séparé)

-- ============================================================
-- 1. BANQUE DE QUESTIONS
-- ============================================================
create table questions (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) default current_centre_id(),
  matiere_id uuid not null references matieres(id),
  classe classe_eleve not null,
  chapitre text not null,
  question text not null,
  choix jsonb not null, -- array de strings
  bonne_reponse_index int not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index on questions (centre_id, classe, matiere_id);

alter table questions enable row level security;
create policy "questions_staff_all" on questions for all to authenticated
  using (centre_id = current_centre_id() and (is_admin() or current_repetiteur_id() is not null))
  with check (centre_id = current_centre_id() and (is_admin() or current_repetiteur_id() is not null));
-- volontairement AUCUNE policy élève : les réponses ne sortent que via RPC.

-- ============================================================
-- 2. DÉFIS v2 (drop v1 — tables vides, RPC remplacées)
-- ============================================================
drop function get_defis_eleve();
drop function get_defi_questions(uuid);
drop function soumettre_defi(uuid, int[], int);
drop function get_classement(text, date);
drop table defi_participations;
drop table defis;

create type defi_type as enum ('hebdo', 'mensuel');

create table defis (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) default current_centre_id(),
  type defi_type not null,
  classe classe_eleve not null,
  matiere_id uuid references matieres(id), -- hebdo : la matière ; mensuel : null (toutes)
  titre text not null,
  nb_questions int not null default 10, -- mensuel : PAR matière du programme de l'élève
  points_base int not null default 100,
  date_debut date not null,
  date_fin date not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (date_fin >= date_debut),
  check ((type = 'hebdo' and matiere_id is not null) or (type = 'mensuel' and matiere_id is null))
);

create table defi_participations (
  defi_id uuid references defis(id) on delete cascade,
  eleve_id uuid references eleves(id) on delete cascade,
  question_ids uuid[] not null, -- tirage personnel, figé au démarrage
  started_at timestamptz not null default now(),
  reponses int[], -- null tant que non soumis
  score int check (score between 0 and 100),
  points int,
  temps_secondes int, -- calculé serveur à la soumission
  submitted_at timestamptz,
  primary key (defi_id, eleve_id)
);

create index on defis (centre_id, classe, date_debut);
create index on defi_participations (eleve_id);

alter table defis enable row level security;
alter table defi_participations enable row level security;

-- Staff du centre : lecture de tous les défis (suivi).
create policy "defis_staff_select" on defis for select to authenticated
  using (centre_id = current_centre_id() and (is_admin() or current_repetiteur_id() is not null));
-- Admin : gestion complète (hebdo + mensuel) dans son centre.
create policy "defis_admin_write" on defis for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());
-- Répétiteur : hebdo uniquement, sa matière, une classe où il a des élèves.
create policy "defis_repetiteur_hebdo" on defis for all to authenticated
  using (
    type = 'hebdo' and centre_id = current_centre_id()
    and exists (select 1 from repetiteur_matieres rm
                where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = defis.matiere_id)
    and exists (select 1 from eleve_repetiteurs er join eleves e on e.id = er.eleve_id
                where er.repetiteur_id = current_repetiteur_id() and e.classe = defis.classe)
  )
  with check (
    type = 'hebdo' and centre_id = current_centre_id()
    and exists (select 1 from repetiteur_matieres rm
                where rm.repetiteur_id = current_repetiteur_id() and rm.matiere_id = defis.matiere_id)
    and exists (select 1 from eleve_repetiteurs er join eleves e on e.id = er.eleve_id
                where er.repetiteur_id = current_repetiteur_id() and e.classe = defis.classe)
  );
-- volontairement AUCUNE policy select élève sur defis.

create policy "participations_select_self" on defi_participations for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "participations_select_staff" on defi_participations for select to authenticated
  using ((is_admin() or current_repetiteur_id() is not null) and eleve_in_my_centre(eleve_id));
-- volontairement AUCUNE policy insert/update : seules les RPC écrivent.

-- ============================================================
-- 3. RPC ÉLÈVE
-- ============================================================

-- Liste des défis de ma classe avec mon statut.
create function get_defis_eleve() returns table (
  id uuid,
  type defi_type,
  titre text,
  matiere_id uuid,
  points_base int,
  date_debut date,
  date_fin date,
  nb_questions_total int,
  statut text, -- 'a_jouer' | 'en_cours' | 'joue'
  score int,
  points int
)
language sql security definer stable set search_path = public as $$
  select d.id, d.type, d.titre, d.matiere_id, d.points_base, d.date_debut, d.date_fin,
         coalesce(
           array_length(p.question_ids, 1),
           case when d.type = 'hebdo' then d.nb_questions
                else d.nb_questions * (select count(*)::int from eleve_matieres em where em.eleve_id = current_eleve_id())
           end
         ) as nb_questions_total,
         case when p.submitted_at is not null then 'joue'
              when p.started_at is not null then 'en_cours'
              else 'a_jouer' end as statut,
         p.score, p.points
  from defis d
  left join defi_participations p
    on p.defi_id = d.id and p.eleve_id = current_eleve_id()
  where d.centre_id = current_centre_id()
    and d.classe = (select e.classe from eleves e where e.id = current_eleve_id())
  order by d.date_debut desc, d.created_at desc;
$$;

-- Démarre (ou reprend) un défi : fige le tirage individuel + started_at,
-- renvoie les questions SANS bonne_reponse_index, taguées matière.
create function demarrer_defi(p_defi_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_defi defis%rowtype;
  v_eleve_id uuid := current_eleve_id();
  v_question_ids uuid[];
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
  if exists (select 1 from defi_participations
             where defi_id = p_defi_id and eleve_id = v_eleve_id and submitted_at is not null) then
    raise exception 'Tu as déjà joué ce défi.';
  end if;

  -- Reprise : tirage déjà figé, on le resert tel quel (le chrono continue).
  select question_ids into v_question_ids
  from defi_participations where defi_id = p_defi_id and eleve_id = v_eleve_id;

  if v_question_ids is null then
    if current_date < v_defi.date_debut or current_date > v_defi.date_fin then
      raise exception 'Ce défi est fermé.';
    end if;
    if v_defi.type = 'hebdo' then
      select array_agg(s.id) into v_question_ids
      from (select q.id from questions q
            where q.centre_id = v_defi.centre_id
              and q.matiere_id = v_defi.matiere_id
              and q.classe = v_defi.classe
            order by random() limit v_defi.nb_questions) s;
    else
      -- Mensuel : nb_questions par matière SUIVIE par l'élève (son programme
      -- classe+série est encodé dans eleve_matieres), groupées par matière.
      select array_agg(s.id) into v_question_ids
      from (select q.id, em.matiere_id from eleve_matieres em
            cross join lateral (
              select id from questions
              where centre_id = v_defi.centre_id
                and matiere_id = em.matiere_id
                and classe = v_defi.classe
              order by random() limit v_defi.nb_questions
            ) q
            where em.eleve_id = v_eleve_id
            order by em.matiere_id) s;
    end if;
    if v_question_ids is null or array_length(v_question_ids, 1) = 0 then
      raise exception 'La banque de questions est vide pour ce défi.';
    end if;
    insert into defi_participations (defi_id, eleve_id, question_ids)
    values (p_defi_id, v_eleve_id, v_question_ids);
  end if;

  return (
    select jsonb_agg(jsonb_build_object(
             'id', q.id, 'question', q.question, 'choix', q.choix, 'matiere', m.nom
           ) order by t.ord)
    from unnest(v_question_ids) with ordinality t(qid, ord)
    join questions q on q.id = t.qid
    join matieres m on m.id = q.matiere_id
  );
end;
$$;

-- Soumission : temps mesuré serveur, scoring sur le tirage figé.
create function soumettre_defi(p_defi_id uuid, p_reponses int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_defi defis%rowtype;
  v_eleve_id uuid := current_eleve_id();
  v_part defi_participations%rowtype;
  v_nb int;
  v_bonnes int := 0;
  v_temps int;
  v_budget int;
  v_score int;
  v_bonus int := 0;
  v_points int;
  i int;
  v_bonne int;
begin
  if v_eleve_id is null then
    raise exception 'Réservé aux élèves.';
  end if;
  select * into v_part from defi_participations
  where defi_id = p_defi_id and eleve_id = v_eleve_id;
  if v_part.defi_id is null then
    raise exception 'Défi non démarré.';
  end if;
  if v_part.submitted_at is not null then
    raise exception 'Tu as déjà joué ce défi.';
  end if;
  select * into v_defi from defis where id = p_defi_id;

  v_nb := array_length(v_part.question_ids, 1);
  if coalesce(array_length(p_reponses, 1), 0) <> v_nb then
    raise exception 'Nombre de réponses invalide.';
  end if;

  for i in 1..v_nb loop
    select q.bonne_reponse_index into v_bonne from questions q where q.id = v_part.question_ids[i];
    if v_bonne = p_reponses[i] then
      v_bonnes := v_bonnes + 1;
    end if;
  end loop;
  v_score := round(100.0 * v_bonnes / v_nb);

  v_temps := greatest(0, extract(epoch from now() - v_part.started_at))::int;
  v_budget := v_nb * 30; -- 30 s par question
  if v_score >= 50 then
    v_bonus := greatest(0, round(0.2 * v_defi.points_base * (1 - least(v_temps, v_budget)::numeric / v_budget)))::int;
  end if;
  v_points := round(v_defi.points_base * v_score / 100.0)::int + v_bonus;

  update defi_participations
  set reponses = p_reponses, score = v_score, points = v_points,
      temps_secondes = v_temps, submitted_at = now()
  where defi_id = p_defi_id and eleve_id = v_eleve_id;

  return jsonb_build_object(
    'score', v_score,
    'points', v_points,
    'bonus', v_bonus,
    'temps_secondes', v_temps,
    'corrections', (select jsonb_agg(q.bonne_reponse_index order by t.ord)
                    from unnest(v_part.question_ids) with ordinality t(qid, ord)
                    join questions q on q.id = t.qid)
  );
end;
$$;

-- Classement hebdomadaire (défis hebdo uniquement, semaine lundi→dimanche).
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
      and d.type = 'hebdo'
      and p.submitted_at is not null
      and (p_scope = 'centre' or e.classe = (select classe from moi))
      and p.submitted_at >= (select jour from lundi)
      and p.submitted_at < (select jour from lundi) + interval '7 days'
    group by p.eleve_id
  ),
  classement as (
    select rank() over (order by ps.total_points desc) as rang,
           ps.eleve_id, e.prenom, left(e.nom, 1) || '.' as nom_initiale,
           e.classe, ps.total_points,
           (ps.eleve_id = (select id from moi)) as est_moi
    from points_semaine ps
    join eleves e on e.id = ps.eleve_id
  )
  select * from classement c where c.rang <= 10 or c.est_moi order by c.rang;
$$;

-- Classement annuel (défis mensuels uniquement, année scolaire sept→août).
create function get_classement_annuel(p_scope text)
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
  annee as (
    select case when extract(month from current_date) >= 9
                then make_date(extract(year from current_date)::int, 9, 1)
                else make_date(extract(year from current_date)::int - 1, 9, 1)
           end as debut
  ),
  points_annee as (
    select p.eleve_id, sum(p.points) as total_points
    from defi_participations p
    join defis d on d.id = p.defi_id
    join eleves e on e.id = p.eleve_id
    where d.centre_id = (select centre_id from moi)
      and d.type = 'mensuel'
      and p.submitted_at is not null
      and (p_scope = 'centre' or e.classe = (select classe from moi))
      and p.submitted_at >= (select debut from annee)
      and p.submitted_at < (select debut from annee) + interval '1 year'
    group by p.eleve_id
  ),
  classement as (
    select rank() over (order by pa.total_points desc) as rang,
           pa.eleve_id, e.prenom, left(e.nom, 1) || '.' as nom_initiale,
           e.classe, pa.total_points,
           (pa.eleve_id = (select id from moi)) as est_moi
    from points_annee pa
    join eleves e on e.id = pa.eleve_id
  )
  select * from classement c where c.rang <= 10 or c.est_moi order by c.rang;
$$;
