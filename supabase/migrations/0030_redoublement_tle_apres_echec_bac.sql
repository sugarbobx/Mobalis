-- MOBALIS — chemin de redoublement en Tle après échec au Bac (migration
-- 0030, audit #15). Deux bugs liés :
--  1. `resultats_bac.eleve_id` était clé primaire seule : un élève qui
--     redouble et repasse le Bac l'année suivante ne pouvait même pas avoir
--     un deuxième résultat enregistré (violation de contrainte).
--  2. app/admin/fin-annee/page.tsx appelait marquerDiplome() sans regarder
--     `obtenu` : un échec au Bac marquait quand même le compte "diplômé"
--     (lecture seule), ce qui bloque justement le redoublement.
-- Le fix DB seul (ci-dessous) débloque l'enregistrement multi-années ; le
-- fix "ne pas diplômer en cas d'échec" est côté TypeScript (page fin-annee).
alter table resultats_bac drop constraint resultats_bac_pkey;
alter table resultats_bac add primary key (eleve_id, annee_scolaire);
