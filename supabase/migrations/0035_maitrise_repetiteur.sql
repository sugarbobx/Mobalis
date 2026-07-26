-- ============================================================
-- MOBALIS — get_maitrise_eleves() : équivalent de get_maitrise()
-- (0007_revision.sql) mais côté répétiteur, pour ses propres élèves
-- uniquement.
--
-- get_maitrise() est scopée à current_eleve_id() et ne prend aucun
-- paramètre — un répétiteur ne peut PAS l'utiliser pour voir la maîtrise
-- de ses élèves : il n'existe aujourd'hui aucune route qui expose cette
-- donnée à quelqu'un d'autre que l'élève lui-même.
--
-- Cette fonction ajoute ce chemin, en restreignant strictement aux élèves
-- effectivement rattachés au répétiteur appelant via eleve_repetiteurs
-- (même table que celle qui alimente Eleve.repetiteurIds côté client,
-- voir lib/store.ts). Un répétiteur ne peut jamais voir un élève qui ne
-- lui est pas assigné, y compris s'il en devine l'identifiant.
-- ============================================================

create function get_maitrise_eleves()
returns table (
  eleve_id uuid,
  matiere_id uuid,
  chapitre text,
  nb_repondues int,
  nb_correctes int,
  pct int
)
language sql security definer stable set search_path = public as $$
  with mes_eleves as (
    select eleve_id from eleve_repetiteurs where repetiteur_id = current_repetiteur_id()
  ),
  reponses as (
    select r.eleve_id, r.correcte, q.matiere_id, q.chapitre,
           row_number() over (
             partition by r.eleve_id, q.matiere_id, q.chapitre
             order by r.created_at desc
           ) as rn
    from revision_reponses r
    join questions q on q.id = r.question_id
    where r.eleve_id in (select eleve_id from mes_eleves)
  )
  select r.eleve_id, r.matiere_id, r.chapitre,
         count(*)::int as nb_repondues,
         (count(*) filter (where r.correcte))::int as nb_correctes,
         round(100.0 * count(*) filter (where r.correcte) / count(*))::int as pct
  from reponses r
  where r.rn <= 20
  group by r.eleve_id, r.matiere_id, r.chapitre
  order by r.eleve_id, r.matiere_id, r.chapitre;
$$;
