-- MOBALIS — un défi hebdo n'est visible que par les élèves du répétiteur qui l'a créé (migration 0034)
--
-- Avant cette migration, `get_defis_eleve()`/`demarrer_defi` ne filtraient
-- que par classe : un élève voyait TOUS les défis hebdo de sa classe, même
-- ceux créés par un répétiteur qui n'est pas le sien (deux répétiteurs
-- peuvent enseigner la même matière à la même classe, pour des groupes
-- d'élèves différents). Corrigé : un défi hebdo n'est visible/jouable par
-- un élève que si ce dernier est dans `eleve_repetiteurs` du créateur
-- (`defis.created_by`). Les défis mensuels (créés par l'admin) restent
-- inchangés — visibles par toute la classe.
--
-- Corollaire : l'index unique posé en 0032 empêchait deux répétiteurs
-- d'avoir chacun leur défi hebdo pour la même matière/classe/semaine — ce
-- qui est désormais un cas normal (élèves différents). Remplacé par un
-- index unique scopé aussi par `created_by`.

drop index defis_hebdo_unique_centre_matiere_classe_semaine;
create unique index defis_hebdo_unique_centre_matiere_classe_semaine_repetiteur
  on defis (centre_id, matiere_id, classe, date_debut, created_by)
  where type = 'hebdo';

create or replace function get_defis_eleve() returns table (
  id uuid,
  type defi_type,
  titre text,
  matiere_id uuid,
  points_base int,
  date_debut date,
  date_fin date,
  nb_questions_total int,
  statut text,
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
    and (
      d.type = 'mensuel'
      or exists (select 1 from eleve_repetiteurs er
                 where er.eleve_id = current_eleve_id() and er.repetiteur_id = d.created_by)
    )
  order by d.date_debut desc, d.created_at desc;
$$;

-- Reprend intégralement la version 0025 (tirage curé banque QCM + fallback
-- legacy) — seul ajout : un défi hebdo n'est démarrable que par un élève de
-- son créateur (l'appartenance de classe seule ne suffit plus).
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
  if v_defi.type = 'hebdo' and not exists (
    select 1 from eleve_repetiteurs er where er.eleve_id = v_eleve_id and er.repetiteur_id = v_defi.created_by
  ) then
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
