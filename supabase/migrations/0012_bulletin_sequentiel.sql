-- MOBALIS — bulletin séquentiel réel (migration 0012)
-- Séquences, coefficients par (matière, série), matricule, classement calculé
-- en direct. Le bulletin annuel existant (bulletins/bulletin_moyennes, flux
-- fin d'année) n'est pas touché — ce système est un ajout, alimenté
-- directement par evaluations, pour le PDF APITemplate.io.

-- ============================================================
-- 1. SÉQUENCES
-- ============================================================
create table sequences (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) default current_centre_id(),
  annee_scolaire text not null,
  libelle text not null,
  ordre int not null default 1,
  date_debut date,
  date_fin date,
  created_at timestamptz not null default now()
);

alter table sequences enable row level security;
create policy "sequences_select" on sequences for select to authenticated
  using (centre_id = current_centre_id());
create policy "sequences_admin_write" on sequences for all to authenticated
  using (is_admin() and centre_id = current_centre_id())
  with check (is_admin() and centre_id = current_centre_id());

-- ============================================================
-- 2. COEFFICIENTS — par (matière, série), pas juste par matière
-- ============================================================
create table matiere_coefficients (
  matiere_id uuid references matieres(id) on delete cascade,
  serie serie_eleve not null,
  coefficient numeric(3,1) not null default 1,
  primary key (matiere_id, serie)
);

alter table matiere_coefficients enable row level security;
create policy "matiere_coefficients_select" on matiere_coefficients for select to authenticated
  using (exists (select 1 from matieres m where m.id = matiere_id and m.centre_id = current_centre_id()));
create policy "matiere_coefficients_admin_write" on matiere_coefficients for all to authenticated
  using (is_admin() and exists (select 1 from matieres m where m.id = matiere_id and m.centre_id = current_centre_id()))
  with check (is_admin() and exists (select 1 from matieres m where m.id = matiere_id and m.centre_id = current_centre_id()));

-- ============================================================
-- 3. COLONNES
-- ============================================================
alter table eleves add column matricule text unique default ('MOB-' || upper(substr(md5(random()::text), 1, 8)));
alter table centres add column adresse text;
alter table centres add column telephone text;
alter table evaluations add column sequence_id uuid references sequences(id);

-- ============================================================
-- 4. BACKFILL — une "Séquence 1" par centre, notes existantes rattachées
-- ============================================================
insert into sequences (centre_id, annee_scolaire, libelle, ordre)
select id, '2025-2026', 'Séquence 1', 1 from centres;

update evaluations e
set sequence_id = s.id
from sequences s, eleves el
where el.id = e.eleve_id
  and s.centre_id = el.centre_id
  and s.libelle = 'Séquence 1'
  and e.sequence_id is null;

-- ============================================================
-- 5. RPC — cœur du calcul de classement
-- ============================================================
create function get_bulletin_sequence(p_eleve_id uuid, p_sequence_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_eleve eleves%rowtype;
  v_centre centres%rowtype;
  v_sequence sequences%rowtype;
  v_autorise boolean;
  v_matieres jsonb;
  v_totaux jsonb;
  v_moyenne_generale numeric;
  v_rang_general int;
  v_effectif int;
  v_moyenne_classe_generale numeric;
  v_mention text;
  v_mention_slug text;
begin
  select * into v_eleve from eleves where id = p_eleve_id;
  if v_eleve.id is null then
    raise exception 'Élève introuvable.';
  end if;

  v_autorise := (is_admin() and eleve_in_my_centre(p_eleve_id))
    or is_eleve_of_repetiteur(p_eleve_id)
    or p_eleve_id = current_eleve_id()
    or is_eleve_of_parent(p_eleve_id);
  if not v_autorise then
    raise exception 'Non autorisé.';
  end if;

  select * into v_centre from centres where id = v_eleve.centre_id;
  select * into v_sequence from sequences where id = p_sequence_id and centre_id = v_eleve.centre_id;
  if v_sequence.id is null then
    raise exception 'Séquence introuvable.';
  end if;

  -- Cohorte de comparaison : élèves actifs de même centre/classe/série.
  create temporary table _cohorte on commit drop as
    select id from eleves
    where centre_id = v_eleve.centre_id and classe = v_eleve.classe and serie = v_eleve.serie and statut_compte = 'actif';

  -- Note moyenne + moyenne de classe + rang, par matière suivie par l'élève.
  create temporary table _par_matiere on commit drop as
    with notes_cohorte as (
      select em.eleve_id, em.matiere_id,
             avg(ev.note) filter (where ev.sequence_id = p_sequence_id) as note_moyenne
      from eleve_matieres em
      join _cohorte c on c.id = em.eleve_id
      left join evaluations ev on ev.eleve_id = em.eleve_id and ev.matiere_id = em.matiere_id
      group by em.eleve_id, em.matiere_id
    ),
    classement as (
      select *,
             rank() over (partition by matiere_id order by note_moyenne desc nulls last) as rang
      from notes_cohorte
    )
    select
      cl.matiere_id,
      m.nom as matiere_nom,
      coalesce(mc.coefficient, 1) as coefficient,
      cl.note_moyenne as note,
      cl.rang as rang_matiere,
      (select round(avg(note_moyenne), 1) from notes_cohorte nc where nc.matiere_id = cl.matiere_id) as moyenne_classe,
      (
        select max(ev2.remarque) filter (where ev2.remarque is not null and length(trim(ev2.remarque)) > 0)
        from evaluations ev2
        where ev2.eleve_id = p_eleve_id and ev2.matiere_id = cl.matiere_id and ev2.sequence_id = p_sequence_id
      ) as appreciation
    from classement cl
    join matieres m on m.id = cl.matiere_id
    left join matiere_coefficients mc on mc.matiere_id = cl.matiere_id and mc.serie = v_eleve.serie
    where cl.eleve_id = p_eleve_id;

  select jsonb_agg(jsonb_build_object(
           'nom', matiere_nom,
           'coefficient', coefficient,
           'note', coalesce(round(note, 1), 0),
           'note_x_coef', coalesce(round(note * coefficient, 1), 0),
           'moyenne_classe', coalesce(moyenne_classe, 0),
           'rang_matiere', coalesce(rang_matiere, 0),
           'appreciation', coalesce(appreciation, '')
         ))
  into v_matieres
  from _par_matiere;

  -- Moyenne générale pondérée de l'élève + classement général dans la cohorte.
  create temporary table _moyennes_generales on commit drop as
    with notes_cohorte as (
      select em.eleve_id, em.matiere_id,
             avg(ev.note) filter (where ev.sequence_id = p_sequence_id) as note_moyenne,
             coalesce(mc.coefficient, 1) as coefficient
      from eleve_matieres em
      join _cohorte c on c.id = em.eleve_id
      left join evaluations ev on ev.eleve_id = em.eleve_id and ev.matiere_id = em.matiere_id
      left join matiere_coefficients mc on mc.matiere_id = em.matiere_id and mc.serie = v_eleve.serie
      group by em.eleve_id, em.matiere_id, mc.coefficient
    )
    select eleve_id,
           sum(note_moyenne * coefficient) / nullif(sum(case when note_moyenne is not null then coefficient else 0 end), 0) as moyenne_ponderee
    from notes_cohorte
    group by eleve_id;

  select moyenne_ponderee into v_moyenne_generale from _moyennes_generales where eleve_id = p_eleve_id;
  select count(*) into v_effectif from _cohorte;
  select round(avg(moyenne_ponderee), 1) into v_moyenne_classe_generale from _moyennes_generales;
  select rang into v_rang_general from (
    select eleve_id, rank() over (order by moyenne_ponderee desc nulls last) as rang
    from _moyennes_generales
  ) r where eleve_id = p_eleve_id;

  v_mention := case
    when v_moyenne_generale >= 16 then 'Excellent'
    when v_moyenne_generale >= 14 then 'Très bien'
    when v_moyenne_generale >= 12 then 'Bien'
    when v_moyenne_generale >= 10 then 'Assez bien'
    else 'Insuffisant'
  end;
  v_mention_slug := case
    when v_moyenne_generale >= 16 then 'excellent'
    when v_moyenne_generale >= 14 then 'tres-bien'
    when v_moyenne_generale >= 12 then 'bien'
    when v_moyenne_generale >= 10 then 'assez-bien'
    else 'insuffisant'
  end;

  return jsonb_build_object(
    'etablissement', jsonb_build_object(
      'nom', v_centre.nom,
      'adresse', coalesce(v_centre.adresse, ''),
      'contact', coalesce(v_centre.telephone, ''),
      'annee_scolaire', v_sequence.annee_scolaire
    ),
    'sequence', jsonb_build_object('libelle', v_sequence.libelle),
    'eleve', jsonb_build_object(
      'nom', v_eleve.nom,
      'prenom', v_eleve.prenom,
      'matricule', v_eleve.matricule,
      'classe', v_eleve.classe,
      'serie', v_eleve.serie
    ),
    'matieres', coalesce(v_matieres, '[]'::jsonb),
    'totaux', jsonb_build_object(
      'moyenne_generale', coalesce(round(v_moyenne_generale, 2), 0),
      'rang_general', coalesce(v_rang_general, 0),
      'effectif_classe', v_effectif,
      'moyenne_classe_generale', coalesce(v_moyenne_classe_generale, 0),
      'mention', v_mention,
      'mention_slug', v_mention_slug
    ),
    'appreciation_conseil', case
      when v_moyenne_generale >= 14 then 'Excellent trimestre, continue ainsi.'
      when v_moyenne_generale >= 10 then 'Trimestre satisfaisant, des efforts supplémentaires sont encouragés.'
      else 'Trimestre difficile, un accompagnement renforcé est recommandé.'
    end
  );
end;
$$;
