# Rapport final — Banque de QCM Mobalis

Généré à l'issue de la génération, sur la base d'une requête directe de la table `exercices` (contenu global, `centre_id IS NULL`) et de ses tables liées (`notions`, `chapitres`, `exercice_difficulte_serie`).

## Volume total

**5000 QCM** insérés, tous en statut `brouillon` (invisibles aux élèves tant qu'un flux de publication n'est pas activé — voir proposition ci-dessous).

## Répartition par matière × niveau

| Matière | 2nde | 1ère | Tle | Total |
|---|---|---|---|---|
| Mathématiques | 546 | 543 | 562 | **1651** |
| Physique-Chimie | 276 | 275 | 276 | **827** |
| SVT | 272 | 273 | 274 | **819** |
| Histoire | 152 | 195 | 162 | **509** |
| Anglais | 207 | 127 | 105 | **439** |
| Géographie | 81 | 129 | 95 | **305** |
| Comptabilité générale | 59 | 108 | 83 | **250** |
| Philosophie | — | — | 200 | **200** |
| **Total** | **1593** | **1650** | **1757** | **5000** |

Philosophie n'existe qu'au niveau Tle dans la base (confirmé dès la phase de taxonomie) — aucune anomalie.

## Répartition par série (toutes matières confondues)

| Série | Nombre d'associations difficulté |
|---|---|
| D | 3529 |
| C | 3139 |
| SES | 1090 |
| A | 789 |

Un même QCM peut être rattaché à plusieurs séries (ex. un QCM de maths 2nde s'applique généralement aux séries C et D). Ces chiffres comptent les lignes `exercice_difficulte_serie`, pas les QCM eux-mêmes.

## Répartition par difficulté

| Difficulté | Nombre |
|---|---|
| Moyen | 3911 |
| Facile | 2648 |
| Difficile | 1988 |

Pas de QCM classé "genius" dans ce lot — le vivier a été calibré sur les trois niveaux standards du programme (facile/moyen/difficile), le niveau "genius" restant disponible pour un futur enrichissement ciblé (défis, révision avancée).

## Part Tier 1 (sources officielles) vs génération par inspiration

- **Sourcés (Tier 1, ex. BAC/Probatoire Cameroun)** : 2 QCM, attribués à *BAC Cameroun 2022, Série D, Exercice 3*.
- **Génération par inspiration** : 4998 QCM.

Le pilote Tier 1 mené en amont de ce chantier a confirmé que les sources ciblées (sigmaths.net, camerecole.org) publient majoritairement des PDF peu exploitables automatiquement en QCM structurés — la bascule vers la génération par inspiration (contenu original, aligné sur les programmes officiels camerounais, vérifié manuellement fait par fait) a donc constitué l'essentiel du volume, conformément à la décision actée dans le prompt v2.

## Couverture de la taxonomie

- **106 chapitres** au total dans la base (8 matières × 3 niveaux, avec adaptations : Philosophie Tle uniquement).
- **106/106 chapitres couverts** (au moins un QCM par chapitre).
- **318 notions** au total ; **314/318 couvertes**.
- **4 notions non couvertes** — toutes de la forme `<chapitre> — applications` en Histoire, un sous-type de notion distinct de `— notions fondamentales` / `— approfondissement` qui n'a pas été sollicité pendant la génération :
  - Histoire / 2nde / Préhistoire et Antiquité — applications
  - Histoire / 1ère / Révolutions française et industrielle — applications
  - Histoire / Tle / Seconde Guerre mondiale — applications
  - Histoire / Tle / Guerre froide — applications

Ce gap est mineur et ponctuel (4 notions sur 318, soit 1,3%) — un complément rapide (une douzaine de QCM) suffirait à le combler si souhaité.

## Contrainte Cameroun (Histoire/Géographie)

Conformément à la consigne fixée en amont, chaque QCM d'Histoire et de Géographie référence explicitement un fait camerounais réel et vérifié (dates, lieux, personnages, institutions). Les faits mobilisés couvrent la préhistoire (Shum Laka), les royaumes précoloniaux (Bamoun, Kotoko, Kanem-Bornou), la colonisation allemande puis franco-britannique, les deux guerres mondiales, l'indépendance et la réunification, la période contemporaine (Ahidjo, Biya, multipartisme, décentralisation), ainsi que la géographie physique, économique et institutionnelle du pays.

## Qualité et méthode

- Chaque QCM a 4 choix, une seule bonne réponse, et un énoncé vérifié (calcul, fait historique/géographique, ou règle scientifique/grammaticale) avant insertion.
- Aucune réponse en attente de validation manuelle (`statut = 'brouillon'`, résolu directement) — conforme au prompt v2, qui exclut le blocage `en_attente`.
- Insertion par lots via script `service_role` (contournement RLS, cohérent avec le reste des scripts e2e de la session), avec vérification post-lot du compte réel en base à chaque étape (pas de confiance aveugle dans un comptage manuel).
- Quelques incidents mineurs corrigés en cours de route : ~15 QCM générés avec un nom de chapitre erroné (avant stabilisation complète de la taxonomie) ont été repérés via le log `SKIP chapitre introuvable`, corrigés et réinsérés avec le bon intitulé — aucune perte de contenu, aucun doublon en base.

---

# Proposition de déploiement (texte seul, aucune implémentation)

Ce qui suit est une proposition de conception, pas du code livré. Trois volets à trancher avant toute mise en production de la banque : le flux de publication, les droits d'écriture sur le contenu global, et les besoins média.

## 1. Flux brouillon → publié

Aujourd'hui, les 5000 QCM sont en `statut = 'brouillon'` : invisibles pour les élèves, visibles seulement via des requêtes admin/service_role. Avant qu'un élève ne les voie, il faut un mécanisme de bascule vers `statut = 'publié'`. Trois options, du plus simple au plus contrôlé :

- **A. Bascule en masse, une fois validée.** Un administrateur Mobalis relit un échantillon (ou fait confiance à la vérification déjà faite QCM par QCM pendant la génération) et bascule tout le lot en une requête `UPDATE`. Rapide, mais tout-ou-rien : si un souci est découvert après coup, il faut le corriger en production plutôt qu'en amont.
- **B. Publication progressive par matière.** On publie matière par matière (ex. Mathématiques d'abord, la plus volumineuse et la plus mécaniquement vérifiable) pour lisser le risque et permettre un premier retour utilisateur avant d'ouvrir le reste.
- **C. Publication via une interface admin dédiée.** Un écran listant les QCM en brouillon avec un bouton "publier" (individuel ou par lot filtré par matière/niveau/chapitre) — implique un développement d'écran, mais donne à un non-développeur la main sur le rythme de mise en ligne, et permet de corriger un QCM avant publication sans passer par SQL direct.

Recommandation : B pour le lancement (réduit le risque, donne un signal rapide), puis C si la banque doit être régulièrement enrichie après le lancement (ce qui est probable — la couverture actuelle laisse de la place pour un futur second lot, notamment sur les 4 notions "applications" non couvertes et sur un éventuel niveau "genius").

## 2. RLS — écriture sur le contenu global

Actuellement, seule la lecture globale (`centre_id IS NULL`) a une policy RLS (`exercices_select_global`, ajoutée en migration 0022). Aucune policy d'écriture sur le contenu global n'existe : la génération de cette session a bypass RLS via `service_role`, ce qui est correct pour un script one-shot mais ne permet à aucun rôle applicatif (admin Mobalis dans l'app) de modifier ce contenu depuis l'interface.

Deux pistes selon qui doit pouvoir toucher au contenu global au quotidien :

- **Rôle "Admin Mobalis" dédié** (distinct des admins de centre) : une colonne ou un rôle applicatif signalant un utilisateur comme super-admin plateforme, avec une policy `exercices_admin_global_write` limitée à `centre_id IS NULL` et à ce rôle. C'est la piste la plus sûre — elle isole clairement qui peut toucher au contenu partagé par tous les centres, évitant qu'un admin de centre normal ne modifie par erreur (ou malveillance) un QCM vu par toute la plateforme.
- **Aucune écriture applicative, tout reste scripté.** Si les mises à jour du contenu global restent rares (nouveaux lots trimestriels, par exemple), il peut être suffisant de garder le flux "script service_role" sans jamais exposer d'écriture via l'app. Plus simple à sécuriser, mais moins flexible pour des corrections ponctuelles rapides.

Recommandation : la première piste, mais seulement si l'usage prévu inclut des corrections fréquentes post-lancement (coquille dans un énoncé, réponse à ajuster). Sinon, la seconde piste évite un chantier RLS supplémentaire pour un besoin qui ne se matérialisera peut-être jamais.

## 3. Besoins média / stockage

Aucun des 5000 QCM générés ne référence d'image, de schéma ou de fichier audio — tout est texte pur (énoncé + 4 choix). Si un futur lot doit inclure des QCM avec figure (ex. un schéma de circuit électrique en Physique, une carte muette en Géographie), cela nécessitera :

- Une colonne (ou une extension du `questions jsonb` existant) pour référencer un chemin de fichier media.
- Un bucket Supabase Storage dédié, avec RLS lecture cohérente avec la policy `exercices_select_global` déjà en place (lecture ouverte à tout authentifié pour le contenu global).

Pas de besoin identifié aujourd'hui — ce point reste une anticipation pour un lot futur, pas une action à mener maintenant. Si un besoin média se confirme, il faudra le signal explicite habituel avant toute création de bucket.

## Synthèse — ce qui reste à décider

| Décision | Urgence | Impact si reporté |
|---|---|---|
| Flux de publication (A/B/C) | Avant tout accès élève | Bloquant — sans bascule, les 5000 QCM restent invisibles |
| RLS écriture globale | Après lancement, si besoin de corrections fréquentes | Faible — le flux script suffit en attendant |
| Bucket média | Seulement si un futur lot inclut des figures | Nul pour l'instant — aucun QCM actuel n'en a besoin |

Aucune de ces trois décisions n'a été implémentée dans ce chantier — elles restent des choix produit à trancher avant la suite.
