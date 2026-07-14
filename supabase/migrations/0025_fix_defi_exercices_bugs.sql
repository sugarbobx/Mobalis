-- MOBALIS — correctifs banque QCM → défis (migration 0025)
-- Six bugs confirmés par revue de code sur la migration 0024 :
--  1. [sécurité] le pool curé pouvait servir du contenu 'brouillon' à un élève
--     (RLS write-check + demarrer_defi ne vérifiaient jamais exercices.statut).
--  2. soumettre_defi supposait exactement une ligne est_correct=true par
--     exercice, sans contrainte DB — 2+ correct plantait la soumission,
--     0 correct notait silencieusement l'index 0 comme "la bonne réponse".
--  3. les branches de tirage curées ne revérifiaient jamais que la
--     matière/classe de l'exercice poussé correspondait à celle du défi.
--  4. un défi mensuel partiellement curé (certaines matières sans QCM poussé)
--     perdait silencieusement ces matières au lieu de retomber sur la banque
--     legacy `questions` pour elles.
--  5. un pool curé plus petit que nb_questions tronquait silencieusement le
--     défi, sans erreur ni signal à l'admin.
-- (le 6e bug, la réinitialisation du filtre "chapitre" en front, est corrigé
--  côté TypeScript dans app/admin/qcm-bank/page.tsx, pas ici.)

-- ============================================================
-- 1. Empêche définitivement 2+ bonnes réponses par exercice (bug #2)
-- ============================================================
create unique index exercice_choix_une_bonne_reponse
  on exercice_choix (exercice_id)
  where est_correct = true;

-- ============================================================
-- 2. RLS defi_exercices : statut publié + matière/classe cohérente (bugs #1, #3)
-- ============================================================
drop policy "defi_exercices_admin_write" on defi_exercices;
create policy "defi_exercices_admin_write" on defi_exercices for all to authenticated
  using (
    is_admin()
    and exists (select 1 from defis d where d.id = defi_id and d.centre_id = current_centre_id())
  )
  with check (
    is_admin()
    and exists (
      select 1 from defis d
      join exercices e on e.id = exercice_id
      join notions n on n.id = e.notion_id
      join chapitres c on c.id = n.chapitre_id
      where d.id = defi_id
        and d.centre_id = current_centre_id()
        and e.centre_id is null
        and e.statut = 'publie'
        and c.classe = d.classe
        and (d.matiere_id is null or e.matiere_id = d.matiere_id)
    )
  );

-- ============================================================
-- 3. demarrer_defi : pool curé utilisé UNIQUEMENT s'il couvre intégralement
--    le besoin (>= nb_questions, matière+classe+statut publié corrects) —
--    sinon fallback complet sur la banque legacy `questions`. Jamais de
--    mélange silencieux des deux sources pour une même participation
--    (bugs #1, #3, #4, #5).
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

    if v_defi.type = 'hebdo' then
      v_curated := (
        select count(*) from defi_exercices de
        join exercices e on e.id = de.exercice_id
        join notions n on n.id = e.notion_id
        join chapitres c on c.id = n.chapitre_id
        where de.defi_id = p_defi_id
          and e.statut = 'publie'
          and e.matiere_id = v_defi.matiere_id
          and c.classe = v_defi.classe
      ) >= v_defi.nb_questions;
    else
      -- Mensuel : curé seulement si CHAQUE matière suivie par l'élève a assez
      -- de QCM poussés (>= nb_questions) — sinon fallback intégral, jamais de
      -- tirage partiellement curé.
      v_curated := exists (select 1 from eleve_matieres where eleve_id = v_eleve_id)
        and not exists (
          select 1 from eleve_matieres em
          where em.eleve_id = v_eleve_id
            and (
              select count(*) from defi_exercices de
              join exercices e on e.id = de.exercice_id
              join notions n on n.id = e.notion_id
              join chapitres c on c.id = n.chapitre_id
              where de.defi_id = p_defi_id
                and e.matiere_id = em.matiere_id
                and e.statut = 'publie'
                and c.classe = v_defi.classe
            ) < v_defi.nb_questions
        );
    end if;
    v_source := case when v_curated then 'exercices' else 'questions' end;

    if v_curated then
      if v_defi.type = 'hebdo' then
        select array_agg(s.id) into v_question_ids
        from (select de.exercice_id as id
              from defi_exercices de
              join exercices e on e.id = de.exercice_id
              join notions n on n.id = e.notion_id
              join chapitres c on c.id = n.chapitre_id
              where de.defi_id = p_defi_id
                and e.statut = 'publie'
                and e.matiere_id = v_defi.matiere_id
                and c.classe = v_defi.classe
              order by random() limit v_defi.nb_questions) s;
      else
        select array_agg(s.id) into v_question_ids
        from (select e.id, em.matiere_id from eleve_matieres em
              cross join lateral (
                select de.exercice_id as id
                from defi_exercices de
                join exercices e2 on e2.id = de.exercice_id
                join notions n2 on n2.id = e2.notion_id
                join chapitres c2 on c2.id = n2.chapitre_id
                where de.defi_id = p_defi_id
                  and e2.matiere_id = em.matiere_id
                  and e2.statut = 'publie'
                  and c2.classe = v_defi.classe
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

-- ============================================================
-- 4. soumettre_defi : correction fail-safe si un exercice n'a aucune bonne
--    réponse marquée (bug #2 — le cas 2+ est désormais impossible grâce à
--    l'index unique partiel créé plus haut).
-- ============================================================
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
  v_correct_ordre int;
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
      -- L'index unique partiel garantit au plus une ligne est_correct=true.
      -- Si aucune (QCM malformé), -1 : aucune réponse élève (toujours >= 0)
      -- ne peut jamais être comptée correcte par accident.
      select ordre into v_correct_ordre
      from exercice_choix where exercice_id = v_part.question_ids[i] and est_correct = true;
      if v_correct_ordre is null then
        v_bonne := -1;
      else
        select count(*) into v_bonne from exercice_choix
        where exercice_id = v_part.question_ids[i] and ordre < v_correct_ordre;
      end if;
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
        (case
           when v_part.source = 'exercices' then
             case when exists (select 1 from exercice_choix where exercice_id = t.qid and est_correct = true)
               then (select count(*) from exercice_choix ec2
                     where ec2.exercice_id = t.qid
                       and ec2.ordre < (select ordre from exercice_choix where exercice_id = t.qid and est_correct = true))
               else -1
             end
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
