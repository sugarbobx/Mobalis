# Audit logique applicative — Mobalis

Revue de code multi-agents (8 domaines, lecture seule) sur l'ensemble de l'app hors banque QCM/défis (déjà auditée et corrigée séparément, migrations 0024/0025). Statut mis à jour après la passe de correctifs — migrations 0026 à 0032, branche `feat/banque-qcm`. Non commité/poussé sans accord explicite.

## 🔴 Critique — fuites de données / sécurité — TOUT CORRIGÉ (migrations 0026-0028)

1. ✅ **Fuite cross-tenant via exercice assigné** — `is_exercice_assigned_to_eleve()`/`is_exercice_assigned_to_parent()` revérifient désormais le centre de l'exercice ; insert d'assignation bloqué à la source si l'exercice n'est pas du centre du répétiteur. Migration 0026.
2. ✅ **Messagerie cross-tenant** — `messages_eleve_all` vérifie maintenant `repetiteur_has_eleve(repetiteur_id)`. Migration 0026.
3. ✅ **Notifications : répétiteur voit tout le centre** — `notifications_select_staff` et `get_notifications_centre()` restreints aux élèves assignés pour un répétiteur (admin garde l'accès centre entier). Migration 0026.
4. ✅ **Réponses QCM envoyées en clair avant correction** — nouvelle vue `exercices_client` (strip `bonneReponseIndex` tant que l'élève n'a pas soumis) + RPC `soumettre_exercice` (scoring serveur, jamais client). `lib/store.ts`, `lib/exercices-eleve.ts`, `components/student/exercise-runner.tsx`. Migration 0027.
5. ✅ **Soumission sans vérification d'appartenance** — `soumissions_eleve_insert` vérifie maintenant `is_assignation_of_eleve(assignation_id)`. Migration 0026.
6. ✅ **Bulletin PDF accessible directement par l'élève** — policies `bulletin_pdfs_select_eleve`/`bulletin_storage_select_eleve` supprimées (seul le parent télécharge, décision produit 0016 enfin appliquée jusqu'au bout). Migration 0026.
7. ✅ **Inscription self-service sans vérif d'email confirmé** — centre + admin ne sont plus créés qu'après confirmation réelle de l'email, via trigger sur `auth.users`. `app/inscription/page.tsx`, `app/inscription/actions.ts` supprimé. Migration 0028.

## 🟠 Bugs majeurs — intégrité des données — TOUT CORRIGÉ (migrations 0027, 0029-0031)

8. ✅ **`assignations.statut`/`score` partagés sur tout un groupe** — statut/score déménagés sur `assignation_eleves` (une ligne par élève). `lib/store.ts` (agrégation groupe + résolution par élève dans `getDevoirsByEleve`), `app/tutor/corrections/page.tsx`. Migration 0027.
9. ✅ **Policy `repetiteurs_visible_to_their_eleves` toujours fausse** — nouvelle fonction `repetiteur_has_eleve()` dans le bon sens + policy parent ajoutée (n'existait pas du tout). Migration 0026.
10. ✅ **`fetchAll()` ne réessaie jamais après un échec** — `fetchAttempted` se réinitialise sur erreur. `lib/store.ts`.
11. ✅ **Mutators traitant un update bloqué par RLS comme un succès** — les ~13 `.update()` du store vérifient maintenant les lignes réellement affectées via `.select()`. `lib/store.ts`.
12. ✅ **Décalage fuseau horaire (UTC vs local)** — nouveau `lib/dates.ts` (`dateLocaleISO`), remplace tous les `.toISOString().slice(0,10)` sur des dates calendaires (défis, classements, paiement, badges). 7 fichiers.
13. ✅ **Dates de soumission figées en dur** — `exercise-runner.tsx` utilise `current_date` serveur (RPC) ; `AUJOURDHUI` retiré de `lib/mock/index.ts`, remplacé par des dates dynamiques.
14. ✅ **Badges quasi jamais évalués** — nouveau `components/student/badge-evaluator.tsx` monté dans `app/student/layout.tsx` (toutes les pages élève, pas seulement Notes & objectifs).
15. ✅ **Pas de chemin de redoublement en Tle après échec au Bac** — `resultats_bac` accepte plusieurs années par élève (PK composite), `marquerDiplome()` n'est plus appelé si le Bac est raté. Migration 0030, `app/admin/fin-annee/page.tsx`.
16. ✅ **Préférence "notifications hebdomadaires" jamais lue** — `envoyer_notifications_en_attente()` respecte désormais `pref_notif_frequence` (flush immédiat vs délai 7 jours). Migration 0029.
17. ✅ **Aucune UI tuteur pour messages et demandes d'aide** — nouvelle page `app/tutor/messages/page.tsx` (fil par élève + demandes d'aide, "marquer traitée"). Migration 0031 (policy update manquante). Admin non couvert (hors scope de cette passe, RLS déjà permissive s'il faut l'ajouter).

## 🟡 Bugs secondaires — partiellement traités (migration 0032)

- ✅ Paiement mock sans verrou — `confirmer_paiement_mock()` prend un `for update`. Migration 0032.
- ✅ Aucune contrainte anti-doublon défi hebdo — index unique partiel `(centre_id, matiere_id, classe, date_debut) where type='hebdo'`. Migration 0032.
- ✅ Champ `lu` jamais remis à jour — `marquerMessagesLus()` appelé à l'ouverture d'un fil (élève et tuteur).
- ✅ Champ mot de passe admin sans `type="password"` — toggle afficher/masquer ajouté (le champ doit rester lisible pour relayer un mot de passe généré).
- ✅ Matière désactivée après affectation : invisible/impossible à retirer — le dialogue admin réintègre maintenant les matières assignées même désactivées, marquées "(désactivée)".
- ⏭️ **Non traités cette passe** (nécessitent une décision produit ou un changement plus large, à traiter séparément) :
  - Moyennes non pondérées en préconisation fin d'année vs moyennes pondérées du bulletin réel.
  - 4ᵉ bug latent moteur de badges (critère "Progression" sur deux mois pas forcément adjacents).
  - Suppression physique d'une question pouvant casser un défi en cours / effacer l'historique de révision (cascade).
  - Facture toujours envoyée à `parentIds[0]`, jamais un choix explicite du parent payeur.
  - Génération de bulletin PDF sans idempotence ni cache.
  - Aucun flux "mot de passe oublié".
  - Boutons d'action admin sans état de chargement (fin d'année notamment).

## Ce qui n'a pas été trouvé

Le module paiements est un mock assumé (commentaires explicites "TODO agrégateur réel") — les manques de contrainte DB (montant positif, unicité référence transaction) sont surtout pertinents **avant** le branchement d'un vrai fournisseur, pas un problème actif aujourd'hui.
