/**
 * lib/roi.ts
 *
 * Croise deux domaines de données qui existent déjà séparément dans l'app —
 * paiements (Paiement.montant/date/statut) et évaluations (Evaluation.note/date,
 * toutes matières confondues) — en une série mensuelle unique, pour répondre
 * à la question que le nom du composant EnfantROI promet déjà sans la tenir :
 * "ce que je paie se traduit-il en résultats ?"
 *
 * Fonction pure, aucun accès store ici — reçoit les données déjà chargées
 * (getPaiementsByEleve / getEvaluationsByEleve) et les agrège.
 */

import type { Paiement, Evaluation } from "./mock/types";

export interface PointROI {
  /** Libellé court d'affichage, ex. "Jan 26" */
  mois: string;
  /** Clé triable, ex. "2026-01" */
  cle: string;
  /** Somme cumulée des paiements au statut "paye" jusqu'à ce mois inclus (FCFA) */
  depenseCumulee: number;
  /** Moyenne des notes obtenues ce mois-là (toutes matières), null si aucune évaluation notée ce mois */
  moyenneMois: number | null;
}

const MOIS_COURT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function cleMois(dateISO: string): string {
  return dateISO.slice(0, 7); // "YYYY-MM"
}

function libelleMois(cle: string): string {
  const [annee, mois] = cle.split("-");
  const idx = Number(mois) - 1;
  return `${MOIS_COURT[idx] ?? mois} ${annee.slice(2)}`;
}

/**
 * @param paiements  Résultat de getPaiementsByEleve(eleveId) — non filtré, la
 *                    fonction ne compte que le statut "paye" dans la dépense.
 * @param evaluations Résultat de getEvaluationsByEleve(eleveId) — les notes
 *                    null (évaluation non encore corrigée) sont ignorées.
 */
export function construireSeriesROI(paiements: Paiement[], evaluations: Evaluation[]): PointROI[] {
  const cles = new Set<string>();
  paiements.forEach((p) => cles.add(cleMois(p.date)));
  evaluations.forEach((e) => {
    if (e.note !== null) cles.add(cleMois(e.date));
  });

  const clesTriees = [...cles].sort();
  let cumule = 0;

  return clesTriees.map((cle) => {
    const depenseMois = paiements
      .filter((p) => p.statut === "paye" && cleMois(p.date) === cle)
      .reduce((acc, p) => acc + p.montant, 0);
    cumule += depenseMois;

    const notesMois = evaluations.filter((e) => e.note !== null && cleMois(e.date) === cle).map((e) => e.note as number);
    const moyenneMois =
      notesMois.length > 0 ? Math.round((notesMois.reduce((a, b) => a + b, 0) / notesMois.length) * 10) / 10 : null;

    return { mois: libelleMois(cle), cle, depenseCumulee: cumule, moyenneMois };
  });
}
