import type { Evaluation } from "./types";

// Seed data only — consume via @/lib/store's useStore().
export const evaluationsSeed: Evaluation[] = [
  // Lucas (e1) - Mathématiques
  { id: "ev1", eleveId: "e1", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-05-04", note: 11, remarque: "Bases correctes mais manque de rigueur dans la rédaction.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev2", eleveId: "e1", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-05-25", note: 13, remarque: "Bons progrès sur les équations, continue les exercices d'entraînement.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev3", eleveId: "e1", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-06-15", note: 14.5, remarque: "Très bonne séance, méthode bien acquise.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev4", eleveId: "e1", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-06-29", note: 15, remarque: "Excellent travail sur le discriminant, à ce rythme le brevet blanc va bien se passer.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Lucas (e1) - Anglais
  { id: "ev5", eleveId: "e1", repetiteurId: "t2", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", date: "2026-05-10", note: 12, remarque: "Vocabulaire à consolider.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev6", eleveId: "e1", repetiteurId: "t2", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", date: "2026-06-07", note: 13.5, remarque: "Bonne participation à l'oral.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev7", eleveId: "e1", repetiteurId: "t2", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", date: "2026-07-01", note: 14, remarque: "Compréhension orale en nette amélioration.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Emma (e2) - Mathématiques
  { id: "ev8", eleveId: "e2", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-05-12", note: 9, remarque: "Difficultés sur les suites, à retravailler.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev9", eleveId: "e2", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-06-02", note: 10.5, remarque: "Progression lente mais réelle.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev10", eleveId: "e2", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", date: "2026-06-30", note: 12, remarque: "La récurrence est enfin bien comprise.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Emma (e2) - SVT
  { id: "ev11", eleveId: "e2", repetiteurId: "t3", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", date: "2026-06-05", note: 15, remarque: "Très à l'aise, continue ainsi.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Noah (e3) - SVT
  { id: "ev12", eleveId: "e3", repetiteurId: "t3", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", date: "2026-06-11", note: 8.5, remarque: "Manque de concentration en séance.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev13", eleveId: "e3", repetiteurId: "t3", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", date: "2026-07-02", note: 10, remarque: "Léger mieux, à encourager sur l'assiduité.", visibleEleve: false, anneeScolaire: "2025-2026" },
  // Noah (e3) - Anglais
  { id: "ev14", eleveId: "e3", repetiteurId: "t2", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", date: "2026-06-18", note: 11, remarque: "Bonne volonté, vocabulaire de base acquis.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Chloé (e4) - Physique
  { id: "ev15", eleveId: "e4", repetiteurId: "t1", matiereId: "f7404080-e582-4260-920a-ae6b042cb019", date: "2026-05-20", note: 13, remarque: "Bon niveau général.", visibleEleve: true, anneeScolaire: "2025-2026" },
  { id: "ev16", eleveId: "e4", repetiteurId: "t1", matiereId: "f7404080-e582-4260-920a-ae6b042cb019", date: "2026-07-03", note: 16, remarque: "Excellente maîtrise des lois de Newton, niveau bac atteint.", visibleEleve: true, anneeScolaire: "2025-2026" },
  // Chloé (e4) - SVT
  { id: "ev17", eleveId: "e4", repetiteurId: "t3", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", date: "2026-06-20", note: 14, remarque: "Solide, continue sur cette lancée.", visibleEleve: true, anneeScolaire: "2025-2026" },
];
