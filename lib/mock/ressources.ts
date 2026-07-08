import type { Ressource } from "./types";

export const ressources: Ressource[] = [
  { id: "r1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", titre: "Fiche - Équations du second degré", type: "fiche", seanceId: "s1", description: "Résumé méthode + formules du discriminant." },
  { id: "r2", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", titre: "Correction - Exercices sur les suites", type: "correction", description: "Corrigé détaillé des exercices de récurrence." },
  { id: "r3", matiereId: "f7404080-e582-4260-920a-ae6b042cb019", titre: "Résumé - Lois de Newton", type: "resume", seanceId: "s5", description: "Les 3 lois de Newton avec exemples d'application." },
  { id: "r4", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", titre: "Fiche - Present Perfect vs Preterit", type: "fiche", seanceId: "s2", description: "Règles d'usage et exemples comparés." },
  { id: "r5", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", titre: "Vocabulaire - Holidays & Travel", type: "fiche", description: "Liste de vocabulaire utile pour l'expression écrite." },
  { id: "r6", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", titre: "Fiche - Reproduction chez les mammifères", type: "fiche", seanceId: "s4", description: "Schéma légendé et étapes clés." },
];

export function getRessourcesByMatiere(matiereId: string): Ressource[] {
  return ressources.filter((r) => r.matiereId === matiereId);
}
