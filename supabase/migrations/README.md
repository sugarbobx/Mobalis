# Migrations Mobalis

Pas de CLI Supabase lié à ce projet (bloqué dans cet environnement — voir
tentative d'installation, `npx supabase` reste bloqué indéfiniment). En
attendant, les migrations sont des fichiers SQL numérotés, appliqués à la
main via le **SQL Editor** du dashboard Supabase, **dans l'ordre du nom de
fichier**.

## Workflow pour un nouveau changement de schéma

1. Crée `NNNN_description.sql` (numéro suivant, incrémental — pas de date,
   pas de CLI pour générer le timestamp).
2. Écris le SQL (idempotent si possible : `if not exists`, etc. — sinon
   documente clairement que c'est à usage unique).
3. Colle-le dans le SQL Editor du dashboard, exécute-le.
4. Commit le fichier une fois confirmé appliqué en production — ce dossier
   est la trace de ce qui a réellement été exécuté, pas un plan.

## État actuel

| Fichier | Contenu | Statut |
|---|---|---|
| `0001_initial_schema.sql` | Tables, enums, index | Appliquée |
| `0002_rls_policies.sql` | RLS + fonctions helper (inclut les correctifs de récursion) | Appliquée |
| `0003_add_email_columns.sql` | `email` sur `repetiteurs`/`eleves` | Appliquée |
| `0004_multi_tenancy.sql` | Table `centres`, `centre_id` sur les racines, RLS par centre | Appliquée |
| `0005_defis.sql` | Défis QCM v1, participations, RPC anti-triche + classement hebdo | Appliquée |
| `0006_banque_questions_defis_v2.sql` | Banque de questions, défis v2 (tirage individuel, hebdo/mensuel, temps serveur, classement annuel) | Appliquée |
| `0007_revision.sql` | Révision : réponses granulaires, RPC session + maîtrise par chapitre | Appliquée |
| `0008_notifications.sql` | Notifications parents (triggers note/absence/remarque/paiement + envoi mocké) | Appliquée |
| `0009_paiements_mobile_money.sql` | Paiements MTN/Orange Money (démo) : colonnes méthode/référence, trigger confirmation, RPC `confirmer_paiement_mock` | Appliquée |
| `0010_consentement_mineurs.sql` | `consentement_accepte_at` sur `parents` (conformité données mineurs) | Appliquée |
| `0011_fix_wording_notification_facture.sql` | Correctif de libellé sur une notification | Appliquée |
| `0012_bulletin_sequentiel.sql` | Bulletin séquentiel (PDF APITemplate.io) : `sequences`, `matiere_coefficients`, matricule élève, adresse/téléphone centre, RPC `get_bulletin_sequence` (classement + moyennes pondérées) | Appliquée |
| `0013_fix_bulletin_sequence_volatility.sql` | Correctif `get_bulletin_sequence` : retire `stable` (incompatible avec `CREATE TEMPORARY TABLE` dans la fonction) | Appliquée |
| `0014_bulletin_pdfs_storage.sql` | Table `bulletin_pdfs` (suivi des PDF stockés) + RLS, policies `storage.objects` pour le bucket `bulletin sequentiel` (Admin/Tutor/Parent/Élève) | À appliquer |

## Créer un nouveau centre

**Self-service (recommandé, depuis 0009+ front-end)** : le directeur du
centre va sur `/inscription`, remplit le formulaire — centre, ville, son
identité, email/mot de passe. L'intention est déposée dans les métadonnées
du compte auth au moment du `signUp()` ; `centres` + `admins` ne sont créés
qu'à la confirmation réelle de l'email, via un trigger DB sur `auth.users`
(migration 0028) — jamais avant, pour empêcher qu'un centre se retrouve lié
à l'adresse email de quelqu'un d'autre. Connexion via `/login` ensuite.
Aucune intervention manuelle nécessaire.

**Procédure manuelle (fallback)** :
1. SQL Editor :
   ```sql
   insert into centres (nom, ville) values ('Nom du centre', 'Ville')
   returning id; -- noter l'id
   ```
2. Dashboard → Authentication → Add user (email + mot de passe du directeur).
   Noter l'UUID du user créé.
3. SQL Editor :
   ```sql
   insert into admins (user_id, nom, prenom, centre_id)
   values ('<uuid auth>', 'Nom', 'Prénom', '<id centre>');
   ```
4. Le directeur se connecte sur `/login` → il ne voit que son centre (RLS),
   et crée ses matières, profils et comptes via `/admin/accounts`.

## Demande de suppression des données d'un élève (conformité mineurs)

Pas d'UI self-service à ce stade (volume trop faible pour le justifier) —
procédure SQL, à exécuter par l'admin du centre concerné sur demande d'un
parent. Le schéma a été conçu avec `on delete cascade` sur toutes les tables
enfants (séances, évaluations, soumissions, messages, participations aux
défis, réponses de révision…) : supprimer la ligne `eleves` suffit à tout
nettoyer proprement.

```sql
-- Vérifier d'abord ce qui sera supprimé :
select * from eleves where id = '<id élève>';

-- Puis, confirmé :
delete from eleves where id = '<id élève>';
```

Si seul un export est demandé (pas de suppression), interroger les tables
concernées filtrées par `eleve_id` et exporter le résultat (CSV depuis le
SQL Editor).

## Si le CLI Supabase redevient utilisable

`supabase link --project-ref ohypneffojhypvvfqjve` puis `supabase db pull`
pour resynchroniser un historique de migrations généré par le CLI à partir
de l'état réel de la base — plus fiable que de reconstituer l'historique à
la main après coup.
