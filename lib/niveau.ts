/**
 * lib/niveau.ts
 *
 * Système de "niveau" — convention purement front-end dérivée des points
 * cumulés de défis (lib/defis.ts, LigneClassement.totalPoints). Aucune
 * colonne serveur ne stocke ce niveau ; il est recalculé à l'affichage.
 *
 * Extrait ici (plutôt que dupliqué dans profil-progression.tsx) pour
 * qu'un seul endroit définisse les paliers si ce système apparaît un jour
 * ailleurs (classement public, vue répétiteur...). Si ce jour arrive,
 * envisager de déplacer ce calcul côté serveur (RPC ou vue) pour éviter
 * toute divergence entre plusieurs fronts.
 */

export const PALIERS_NIVEAU = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

export interface EtatNiveau {
  niveau: number;
  pointsDansNiveau: number;
  pointsPourNiveauSuivant: number | null;
}

export function calculerNiveau(totalPoints: number): EtatNiveau {
  let niveau = 1;
  for (let i = 1; i < PALIERS_NIVEAU.length; i++) {
    if (totalPoints >= PALIERS_NIVEAU[i]) niveau = i + 1;
    else break;
  }
  const seuilActuel = PALIERS_NIVEAU[niveau - 1];
  const seuilSuivant: number | null = PALIERS_NIVEAU[niveau] ?? null;
  return {
    niveau,
    pointsDansNiveau: totalPoints - seuilActuel,
    pointsPourNiveauSuivant: seuilSuivant !== null ? seuilSuivant - seuilActuel : null,
  };
}
