-- MOBALIS — module révision (migration 0007)
-- Prérequis : 0006 appliquée (banque de questions).
--
-- Révision = entraînement sans pression : tentatives illimitées, tirages
-- aléatoires dans la banque, ZÉRO point de classement. Chaque réponse est
-- enregistrée individuellement pour construire la maîtrise par chapitre
-- (fenêtre glissante : les 20 dernières réponses par chapitre font foi).

create table revision_reponses (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  correcte boolean not null,
  created_at timestamptz not null default now()
);

create index on revision_reponses (eleve_id, created_at desc);

alter table revision_reponses enable row level security;
create policy "revision_select_self" on revision_reponses for select to authenticated
  using (eleve_id = current_eleve_id());
create policy "revision_select_staff" on revision_reponses for select to authenticated
  using ((is_admin() or current_repetiteur_id() is not null) and eleve_in_my_centre(eleve_id));
-- volontairement AUCUNE policy insert : seule soumettre_revision() écrit.

-- ============================================================
-- RPC
-- ============================================================

-- Chapitres disponibles dans la banque pour la classe de l'élève.
create function get_chapitres(p_matiere_id uuid)
returns table (chapitre text, nb_questions int)
language sql security definer stable set search_path = public as $$
  select q.chapitre, count(*)::int
  from questions q
  where q.centre_id = current_centre_id()
    and q.matiere_id = p_matiere_id
    and q.classe = (select e.classe from eleves e where e.id = current_eleve_id())
  group by q.chapitre
  order by q.chapitre;
$$;

-- Tirage d'une session de révision — sans état, rien n'est écrit ici.
create function demarrer_revision(p_matiere_id uuid, p_chapitre text default null, p_nb int default 10)
returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_agg(jsonb_build_object(
           'id', s.id, 'question', s.question, 'choix', s.choix, 'chapitre', s.chapitre))
  from (
    select q.id, q.question, q.choix, q.chapitre
    from questions q
    where q.centre_id = current_centre_id()
      and q.matiere_id = p_matiere_id
      and q.classe = (select e.classe from eleves e where e.id = current_eleve_id())
      and (p_chapitre is null or q.chapitre = p_chapitre)
    order by random()
    limit least(greatest(p_nb, 1), 30)
  ) s;
$$;

-- Correction serveur + enregistrement granulaire pour la maîtrise.
create function soumettre_revision(p_question_ids uuid[], p_reponses int[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_eleve_id uuid := current_eleve_id();
  v_nb int;
  v_bonnes int := 0;
  v_bonne int;
  v_valide boolean;
  i int;
begin
  if v_eleve_id is null then
    raise exception 'Réservé aux élèves.';
  end if;
  v_nb := coalesce(array_length(p_question_ids, 1), 0);
  if v_nb = 0 or v_nb > 50 or coalesce(array_length(p_reponses, 1), 0) <> v_nb then
    raise exception 'Session invalide.';
  end if;

  for i in 1..v_nb loop
    select q.bonne_reponse_index into v_bonne
    from questions q
    where q.id = p_question_ids[i]
      and q.centre_id = current_centre_id()
      and q.classe = (select e.classe from eleves e where e.id = v_eleve_id);
    if v_bonne is null then
      raise exception 'Question hors de ton programme.';
    end if;
    v_valide := (v_bonne = p_reponses[i]);
    if v_valide then
      v_bonnes := v_bonnes + 1;
    end if;
    insert into revision_reponses (eleve_id, question_id, correcte)
    values (v_eleve_id, p_question_ids[i], v_valide);
  end loop;

  return jsonb_build_object(
    'score', round(100.0 * v_bonnes / v_nb),
    'corrections', (select jsonb_agg(q.bonne_reponse_index order by t.ord)
                    from unnest(p_question_ids) with ordinality t(qid, ord)
                    join questions q on q.id = t.qid)
  );
end;
$$;

-- Maîtrise par (matière, chapitre) : % de bonnes réponses sur les 20
-- dernières réponses du chapitre — la progression récente fait foi.
create function get_maitrise()
returns table (
  matiere_id uuid,
  chapitre text,
  nb_repondues int,
  nb_correctes int,
  pct int
)
language sql security definer stable set search_path = public as $$
  with reponses as (
    select r.correcte, q.matiere_id, q.chapitre,
           row_number() over (partition by q.matiere_id, q.chapitre order by r.created_at desc) as rn
    from revision_reponses r
    join questions q on q.id = r.question_id
    where r.eleve_id = current_eleve_id()
  )
  select r.matiere_id, r.chapitre,
         count(*)::int as nb_repondues,
         (count(*) filter (where r.correcte))::int as nb_correctes,
         round(100.0 * count(*) filter (where r.correcte) / count(*))::int as pct
  from reponses r
  where r.rn <= 20
  group by r.matiere_id, r.chapitre
  order by r.matiere_id, r.chapitre;
$$;
