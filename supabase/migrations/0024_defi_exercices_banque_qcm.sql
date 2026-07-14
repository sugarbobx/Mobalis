-- MOBALIS — pont Banque QCM → Défis (migration 0024)
-- Contexte : la banque de ~5000 QCM (migration 0022/0023, exercices/exercice_choix,
-- centre_id IS NULL) n'était reliée à rien côté application. Ce correctif ajoute :
--  1. defi_exercices : table de liaison admin-curée, garde-fou "le défi doit déjà
--     exister" assuré par la FK (pas juste une vérification UI).
--  2. demarrer_defi/soumettre_defi réécrites : si un pool curé existe pour le défi,
--     le tirage se fait dedans (exercices/exercice_choix) ; sinon comportement
--     legacy inchangé (table questions). Le contrat front (QuestionDefi/ResultatDefi,
--     lib/defis.ts) ne change pas — aucune modif élève nécessaire.

-- ============================================================
-- 1. TABLE DE LIAISON
-- ============================================================
create table defi_exercices (
  defi_id uuid not null references defis(id) on delete cascade,
  exercice_id uuid not null references exercices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (defi_id, exercice_id)
);

create index on defi_exercices (defi_id);

alter table defi_exercices enable row level security;

-- Staff du centre (admin + répétiteurs) : lecture, pour voir ce qui est déjà poussé.
create policy "defi_exercices_staff_select" on defi_exercices for select to authenticated
  using (
    exists (
      select 1 from defis d
      where d.id = defi_id
        and d.centre_id = current_centre_id()
        and (is_admin() or current_repetiteur_id() is not null)
    )
  );

-- Admin uniquement : écriture (push/retrait), et seulement vers un défi de son
-- centre + depuis la banque globale (centre_id is null), jamais depuis les
-- exercices legacy propres à un centre.
create policy "defi_exercices_admin_write" on defi_exercices for all to authenticated
  using (
    is_admin()
    and exists (select 1 from defis d where d.id = defi_id and d.centre_id = current_centre_id())
  )
  with check (
    is_admin()
    and exists (select 1 from defis d where d.id = defi_id and d.centre_id = current_centre_id())
    and exists (select 1 from exercices e where e.id = exercice_id and e.centre_id is null)
  );

-- ============================================================
-- 2. TRAÇABILITÉ DE LA SOURCE DU TIRAGE
-- ============================================================
alter table defi_participations
  add column source text not null default 'questions' check (source in ('questions', 'exercices'));

-- ============================================================
-- 3. RPC RÉÉCRITES
-- ============================================================

create or replace function demarrer_defi(p_defi_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_defi defis%rowtype;
  v_eleve_id uuid := current_eleve_id();
  v_question_ids uuid[];
  v_source text;
  v_curated boolean;
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

  -- Reprise : tirage + source déjà figés, on les resert tels quels.
  select question_ids, source into v_question_ids, v_source
  from defi_participations where defi_id = p_defi_id and eleve_id = v_eleve_id;

  if v_question_ids is null then
    if current_date < v_defi.date_debut or current_date > v_defi.date_fin then
      raise exception 'Ce défi est fermé.';
    end if;

    v_curated := exists (select 1 from defi_exercices where defi_id = p_defi_id);
    v_source := case when v_curated then 'exercices' else 'questions' end;

    if v_curated then
      if v_defi.type = 'hebdo' then
        select array_agg(s.id) into v_question_ids
        from (select de.exercice_id as id from defi_exercices de
              where de.defi_id = p_defi_id
              order by random() limit v_defi.nb_questions) s;
      else
        -- Mensuel curé : nb_questions par matière SUIVIE par l'élève, piochées
        -- uniquement parmi les exercices poussés sur CE défi pour cette matière.
        select array_agg(s.id) into v_question_ids
        from (select e.id, em.matiere_id from eleve_matieres em
              cross join lateral (
                select de.exercice_id as id from defi_exercices de
                join exercices e2 on e2.id = de.exercice_id
                where de.defi_id = p_defi_id and e2.matiere_id = em.matiere_id
                order by random() limit v_defi.nb_questions
              ) e
              where em.eleve_id = v_eleve_id
              order by em.matiere_id) s;
      end if;
    elsif v_defi.type = 'hebdo' then
      select array_agg(s.id) into v_question_ids
      from (select q.id from questions q
            where q.centre_id = v_defi.centre_id
              and q.matiere_id = v_defi.matiere_id
              and q.classe = v_defi.classe
            order by random() limit v_defi.nb_questions) s;
    else
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
    insert into defi_participations (defi_id, eleve_id, question_ids, source)
    values (p_defi_id, v_eleve_id, v_question_ids, v_source);
  end if;

  if v_source = 'exercices' then
    return (
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'question', e.enonce,
               'choix', (select jsonb_agg(ec.texte_choix order by ec.ordre)
                         from exercice_choix ec where ec.exercice_id = e.id),
               'matiere', m.nom
             ) order by t.ord)
      from unnest(v_question_ids) with ordinality t(qid, ord)
      join exercices e on e.id = t.qid
      join matieres m on m.id = e.matiere_id
    );
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

create or replace function soumettre_defi(p_defi_id uuid, p_reponses int[]) returns jsonb
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
    if v_part.source = 'exercices' then
      select count(*) into v_bonne
      from exercice_choix ec
      where ec.exercice_id = v_part.question_ids[i]
        and ec.ordre < (select ordre from exercice_choix
                         where exercice_id = v_part.question_ids[i] and est_correct = true);
    else
      select q.bonne_reponse_index into v_bonne from questions q where q.id = v_part.question_ids[i];
    end if;
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
    'corrections', (
      select jsonb_agg(
        (case when v_part.source = 'exercices' then
          (select count(*) from exercice_choix ec2
           where ec2.exercice_id = t.qid
             and ec2.ordre < (select ordre from exercice_choix where exercice_id = t.qid and est_correct = true))
         else
          (select q.bonne_reponse_index from questions q where q.id = t.qid)
         end)
        order by t.ord
      )
      from unnest(v_part.question_ids) with ordinality t(qid, ord)
    )
  );
end;
$$;
