-- MOBALIS — matières : retrait Espagnol, ajout de 4 matières pour la série SES
-- Espagnol (statut inactif) vérifié à zéro référence (exercices, evaluations,
-- eleve_matieres, questions, defis, ressources, matiere_coefficients) avant suppression.

delete from matieres where nom = 'Espagnol';

insert into matieres (nom, statut, couleur, series, centre_id)
select nouvelles_matieres.nom, 'actif', nouvelles_matieres.couleur, array['SES']::serie_eleve[], centres.id
from centres
cross join (
  values
    ('Histoire', '#5C7CFA'),
    ('Géographie', '#4C6EF5'),
    ('Philosophie', '#0066FF'),
    ('Comptabilité générale', '#3385FF')
) as nouvelles_matieres(nom, couleur);
