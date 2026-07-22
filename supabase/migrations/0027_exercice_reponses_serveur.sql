-- MOBALIS — corrige la fuite de réponses QCM avant correction (migration 0027)
-- Audit item #4 (AUDIT_LOGIQUE_APPLICATION.md) : fetchAll() chargeait
-- exercices.questions (jsonb avec bonneReponseIndex) intégralement pour tout
-- élève ayant un exercice assigné — la bonne réponse était visible dans
-- l'onglet réseau avant même de répondre. Contrairement aux défis (migration
-- 0006, RPC security definer dédiée), le flux exercice legacy n'avait aucune
-- protection : ni au chargement, ni à la soumission (updateAssignation/
-- addSoumission passaient par le client, bloqués silencieusement par RLS —
-- aucune policy update pour l'élève sur `assignations` n'a jamais existé,
-- donc le score ne persistait même pas réellement côté serveur).
--
-- Fix en deux parties, même doctrine que les défis :
--  1. Vue `exercices_client` : remplace la lecture directe de `exercices`
--     dans lib/store.ts. Strip bonneReponseIndex pour un élève/parent tant
--     que l'élève concerné n'a pas encore soumis — admin/répétiteur (créateur
--     ou bibliothèque) gardent la ligne complète, inchangé. Vue créée par le
--     rôle d'application des migrations (bypassrls) : sa propre clause WHERE/
--     CASE fait autorité, les policies RLS de la table restent actives en
--     défense en profondeur pour tout accès direct à `exercices`.
--  2. RPC `soumettre_exercice` : calcul du score et persistance de
--     soumissions/assignation_eleves faits côté serveur (security definer),
--     jamais côté client. Remplace les appels client addSoumission +
--     updateAssignation dans components/student/exercise-runner.tsx.
--
-- Au passage (audit item #8) : statut/score déménagent de `assignations`
-- (une ligne PARTAGÉE par tout le groupe assigné) vers `assignation_eleves`
-- (une ligne par élève). Avant ce fix, le premier élève d'un groupe qui
-- soumettait verrouillait le devoir ("déjà corrigé") pour tout le monde, et
-- app/tutor/corrections/page.tsx écrasait le score du GROUPE ENTIER avec
-- celui d'un seul élève corrigé manuellement. `assignations.statut/score`
-- restent en base (non détruits, plus lus ni écrits par personne) — la
-- vérité vit désormais exclusivement sur assignation_eleves.
-- ============================================================

alter table assignation_eleves add column statut text not null default 'a_faire'
  check (statut in ('a_faire', 'fait', 'corrige'));
alter table assignation_eleves add column score int;

update assignation_eleves ae set statut = a.statut, score = a.score
from assignations a where a.id = ae.assignation_id;

create or replace view exercices_client as
select
  e.id, e.centre_id, e.matiere_id, e.type, e.titre, e.consigne,
  e.createur, e.createur_id, e.enonce, e.dans_bibliotheque,
  case
    when e.type <> 'qcm' then e.questions
    when is_admin() and e.centre_id = current_centre_id() then e.questions
    when e.createur_id = current_repetiteur_id() then e.questions
    when e.dans_bibliotheque and current_repetiteur_id() is not null and e.centre_id = current_centre_id()
      then e.questions
    when is_exercice_assigned_to_eleve(e.id) and exists (
      select 1 from assignations a
      join soumissions s on s.assignation_id = a.id
      where a.exercice_id = e.id and s.eleve_id = current_eleve_id()
    ) then e.questions
    when is_exercice_assigned_to_eleve(e.id) or is_exercice_assigned_to_parent(e.id) then (
      select jsonb_agg(jsonb_build_object('question', q ->> 'question', 'choix', q -> 'choix') order by ord)
      from jsonb_array_elements(e.questions) with ordinality as t(q, ord)
    )
    else null
  end as questions
from exercices e
where
  (is_admin() and e.centre_id = current_centre_id())
  or e.createur_id = current_repetiteur_id()
  or (e.dans_bibliotheque and current_repetiteur_id() is not null and e.centre_id = current_centre_id())
  or is_exercice_assigned_to_eleve(e.id)
  or (e.type <> 'diagnostic' and is_exercice_assigned_to_parent(e.id));

-- ============================================================
-- RPC : soumission serveur-autoritaire (QCM auto-corrigé ou réponse libre).
-- Remplace le calcul de score client + les deux écritures client
-- (addSoumission, updateAssignation) qui échouaient silencieusement pour
-- l'update (aucune policy `assignations` update pour l'élève).
-- ============================================================
create function soumettre_exercice(
  p_assignation_id uuid,
  p_reponses int[] default null,
  p_reponse_libre text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_eleve_id uuid := current_eleve_id();
  v_assignation assignations%rowtype;
  v_exercice exercices%rowtype;
  v_nb int;
  v_bonnes int := 0;
  v_score int;
  v_bonne int;
  i int;
  v_corrections int[] := array[]::int[];
begin
  if v_eleve_id is null then
    raise exception 'Réservé aux élèves.';
  end if;
  if not is_assignation_of_eleve(p_assignation_id) then
    raise exception 'Devoir introuvable.';
  end if;
  if exists (select 1 from soumissions where assignation_id = p_assignation_id and eleve_id = v_eleve_id) then
    raise exception 'Tu as déjà répondu à cet exercice.';
  end if;

  select * into v_assignation from assignations where id = p_assignation_id;
  select * into v_exercice from exercices where id = v_assignation.exercice_id;

  if v_exercice.type = 'qcm' then
    v_nb := jsonb_array_length(v_exercice.questions);
    if p_reponses is null or coalesce(array_length(p_reponses, 1), 0) <> v_nb then
      raise exception 'Nombre de réponses invalide.';
    end if;
    for i in 0..v_nb - 1 loop
      v_bonne := (v_exercice.questions -> i ->> 'bonneReponseIndex')::int;
      v_corrections := v_corrections || v_bonne;
      if v_bonne = p_reponses[i + 1] then
        v_bonnes := v_bonnes + 1;
      end if;
    end loop;
    v_score := round(100.0 * v_bonnes / v_nb);

    insert into soumissions (assignation_id, eleve_id, reponse_qcm, date, statut, score_auto, score_final)
    values (p_assignation_id, v_eleve_id, p_reponses, current_date, 'auto_corrige', v_score, v_score);

    update assignation_eleves set statut = 'corrige', score = v_score
    where assignation_id = p_assignation_id and eleve_id = v_eleve_id;

    return jsonb_build_object('score', v_score, 'corrections', to_jsonb(v_corrections));
  else
    if p_reponse_libre is null or length(trim(p_reponse_libre)) = 0 then
      raise exception 'Réponse vide.';
    end if;

    insert into soumissions (assignation_id, eleve_id, reponse_libre, date, statut)
    values (p_assignation_id, v_eleve_id, p_reponse_libre, current_date, 'en_attente_correction');

    update assignation_eleves set statut = 'fait'
    where assignation_id = p_assignation_id and eleve_id = v_eleve_id;

    return jsonb_build_object('score', null, 'corrections', '[]'::jsonb);
  end if;
end;
$$;
