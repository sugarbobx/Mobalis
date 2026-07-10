-- MOBALIS — ressources : recatégorisation cours / anciennes épreuves
-- fiche/resume -> cours (matériel de cours), correction -> ancienne_epreuve
-- (une correction est un sous-produit d'une épreuve passée).
-- Le check constraint d'origine (0001) restreint type à fiche/resume/correction
-- — il faut le remplacer avant de pouvoir écrire les nouvelles valeurs.

alter table ressources drop constraint ressources_type_check;

update ressources set type = 'cours' where type in ('fiche', 'resume');
update ressources set type = 'ancienne_epreuve' where type = 'correction';

alter table ressources add constraint ressources_type_check check (type in ('cours', 'ancienne_epreuve'));
