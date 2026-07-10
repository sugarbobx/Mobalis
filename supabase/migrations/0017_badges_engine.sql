-- MOBALIS — moteur d'attribution de badges réel
-- badges/badges_obtenus existaient déjà (migration 0001) mais rien ne les
-- attribuait jamais (seed manuel uniquement). Ajoute des identifiants
-- stables (code) aux 4 badges existants, ajoute 5 nouveaux badges branchés
-- sur défis/révision/bulletin séquentiel, et une RPC evaluer_badges() qui
-- vérifie chaque critère et insère ce qui est nouvellement acquis.

alter table badges add column code text unique;

update badges set code = 'assidu' where nom = 'Assidu';
update badges set code = 'sans_faute' where nom = 'Sans-faute';
update badges set code = 'regulier' where nom = 'Régulier';
update badges set code = 'progression' where nom = 'Progression';

alter table badges alter column code set not null;

insert into badges (nom, description, icone, code) values
  ('Premier défi', 'Ton premier défi relevé — la suite commence ici.', 'Rocket', 'premier_defi'),
  ('Série de défis', '4 défis hebdomadaires enchaînés.', 'Zap', 'serie_defis'),
  ('Champion de la semaine', 'Meilleur score sur un défi hebdomadaire.', 'Crown', 'champion_semaine'),
  ('Maître du chapitre', 'Maîtrise à 100% sur un chapitre en révision.', 'Star', 'maitre_chapitre'),
  ('Mention Excellence', 'Moyenne générale ≥16 sur une séquence.', 'Award', 'mention_excellence');

-- ============================================================
-- RPC : évalue tous les critères pour un élève, insère les nouveaux badges,
-- renvoie les codes nouvellement acquis (utile pour un toast côté UI).
-- ============================================================
create function evaluer_badges(p_eleve_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_autorise boolean;
  v_codes_acquis text[] := '{}';
  v_nouveaux jsonb;
  v_flag boolean;
begin
  select * into v_eleve from eleves where id = p_eleve_id;
  if v_eleve.id is null then
    raise exception 'Élève introuvable.';
  end if;

  v_autorise := p_eleve_id = current_eleve_id()
    or (is_admin() and eleve_in_my_centre(p_eleve_id))
    or is_eleve_of_repetiteur(p_eleve_id);
  if not v_autorise then
    raise exception 'Non autorisé.';
  end if;

  -- Assidu : 5 dernières séances terminées, toutes présentes.
  select (select count(*) from dernieres) = 5
     and (select count(*) filter (where present) from dernieres) = 5
  into v_flag
  from (
    select present from seances
    where eleve_id = p_eleve_id and statut = 'terminee'
    order by date desc limit 5
  ) dernieres;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'assidu';
  end if;

  -- Sans-faute : une soumission notée à 100%.
  select exists (
    select 1 from soumissions
    where eleve_id = p_eleve_id and coalesce(score_final, score_auto) = 100
  ) into v_flag;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'sans_faute';
  end if;

  -- Régulier : aucun devoir en retard sur 30 jours, ≥3 rendus.
  select not exists (
      select 1 from devoirs_recents dr
      where dr.date_echeance < current_date
        and not exists (
          select 1 from soumissions s
          where s.assignation_id = dr.assignation_id and s.eleve_id = p_eleve_id
        )
    )
    and (
      select count(*) from soumissions s
      join devoirs_recents dr on dr.assignation_id = s.assignation_id
      where s.eleve_id = p_eleve_id
    ) >= 3
  into v_flag
  from (
    select ae.assignation_id, a.date_echeance
    from assignation_eleves ae
    join assignations a on a.id = ae.assignation_id
    where ae.eleve_id = p_eleve_id and a.date_echeance >= current_date - interval '30 days'
  ) devoirs_recents;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'regulier';
  end if;

  -- Progression : +3 pts de moyenne (mois courant vs mois précédent).
  select coalesce(
    (select moyenne from m where rn = 1) - (select moyenne from m where rn = 2) >= 3,
    false
  ) into v_flag
  from (
    select avg(note) as moyenne,
           row_number() over (order by date_trunc('month', date) desc) as rn
    from evaluations
    where eleve_id = p_eleve_id and note is not null
    group by date_trunc('month', date)
  ) m
  limit 1;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'progression';
  end if;

  -- Premier défi : au moins une participation soumise.
  select exists (
    select 1 from defi_participations where eleve_id = p_eleve_id and score is not null
  ) into v_flag;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'premier_defi';
  end if;

  -- Série de défis : les 4 derniers défis hebdo de sa classe, tous soumis.
  select count(*) = 4 into v_flag
  from (
    select id from defis
    where type = 'hebdo' and classe = v_eleve.classe and centre_id = v_eleve.centre_id
    order by date_debut desc limit 4
  ) derniers_hebdo
  join defi_participations dp
    on dp.defi_id = derniers_hebdo.id and dp.eleve_id = p_eleve_id and dp.submitted_at is not null;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'serie_defis';
  end if;

  -- Champion de la semaine : meilleur score sur son dernier défi hebdo soumis.
  select coalesce(
    dd.score is not null and dd.score >= all (
      select score from defi_participations where defi_id = dd.defi_id and score is not null
    ),
    false
  ) into v_flag
  from (
    select dp.defi_id, dp.score
    from defi_participations dp
    join defis d on d.id = dp.defi_id
    where dp.eleve_id = p_eleve_id and d.type = 'hebdo' and dp.submitted_at is not null
    order by d.date_debut desc limit 1
  ) dd;
  if v_flag is null then v_flag := false; end if;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'champion_semaine';
  end if;

  -- Maître du chapitre : 20/20 sur les 20 dernières réponses d'un chapitre.
  select exists (
    select 1 from (
      select r.correcte, q.matiere_id, q.chapitre,
             row_number() over (partition by q.matiere_id, q.chapitre order by r.created_at desc) as rn
      from revision_reponses r
      join questions q on q.id = r.question_id
      where r.eleve_id = p_eleve_id
    ) reponses
    where rn <= 20
    group by matiere_id, chapitre
    having count(*) = 20 and count(*) filter (where correcte) = 20
  ) into v_flag;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'maitre_chapitre';
  end if;

  -- Mention Excellence : moyenne pondérée ≥16 sur au moins une séquence.
  select exists (
    select 1 from sequences s
    where s.centre_id = v_eleve.centre_id
      and (
        select sum(t.avg_note * t.coef) / nullif(sum(case when t.avg_note is not null then t.coef else 0 end), 0)
        from (
          select em.matiere_id,
                 avg(ev.note) filter (where ev.sequence_id = s.id) as avg_note,
                 coalesce(mc.coefficient, 1) as coef
          from eleve_matieres em
          left join evaluations ev on ev.eleve_id = em.eleve_id and ev.matiere_id = em.matiere_id
          left join matiere_coefficients mc on mc.matiere_id = em.matiere_id and mc.serie = v_eleve.serie
          where em.eleve_id = p_eleve_id
          group by em.matiere_id, mc.coefficient
        ) t
      ) >= 16
  ) into v_flag;
  if v_flag then
    v_codes_acquis := v_codes_acquis || 'mention_excellence';
  end if;

  -- Insère les badges qualifiés pas encore obtenus, renvoie ceux réellement nouveaux.
  with a_inserer as (
    select b.id as badge_id
    from badges b
    where b.code = any(v_codes_acquis)
      and not exists (
        select 1 from badges_obtenus bo where bo.badge_id = b.id and bo.eleve_id = p_eleve_id
      )
  ),
  inseres as (
    insert into badges_obtenus (badge_id, eleve_id)
    select badge_id, p_eleve_id from a_inserer
    on conflict do nothing
    returning badge_id
  )
  select jsonb_agg(b.code) into v_nouveaux
  from inseres i join badges b on b.id = i.badge_id;

  return coalesce(v_nouveaux, '[]'::jsonb);
end;
$$;
