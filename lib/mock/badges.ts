import type { Badge, BadgeObtenu, Objectif, AutoEvaluation } from "./types";

// Static catalog — never mutated, safe to import directly anywhere.
export const badges: Badge[] = [
  { id: "b1", nom: "Assidu", description: "5 séances consécutives sans absence.", icone: "CalendarCheck" },
  { id: "b2", nom: "Sans-faute", description: "100% à un exercice QCM.", icone: "Trophy" },
  { id: "b3", nom: "Régulier", description: "Tous les devoirs rendus dans les temps sur un mois.", icone: "Flame" },
  { id: "b4", nom: "Progression", description: "+3 points de moyenne en un mois.", icone: "TrendingUp" },
];

// Seed data only (mutable domains) — consume via @/lib/store's useStore().
export const badgesObtenusSeed: BadgeObtenu[] = [
  { badgeId: "b1", eleveId: "e1", date: "2026-06-20" },
  { badgeId: "b2", eleveId: "e1", date: "2026-06-24" },
  { badgeId: "b4", eleveId: "e1", date: "2026-06-30" },
  { badgeId: "b2", eleveId: "e2", date: "2026-06-19" },
];

export const objectifsSeed: Objectif[] = [
  { id: "o1", eleveId: "e1", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", titre: "Atteindre 15/20 de moyenne avant le brevet blanc", progression: 75, dateEcheance: "2026-09-15" },
  { id: "o2", eleveId: "e1", repetiteurId: "t2", matiereId: "09350be0-60d8-4e91-8d96-af91e4175c2c", titre: "Être à l'aise à l'oral en compréhension", progression: 60, dateEcheance: "2026-10-01" },
  { id: "o3", eleveId: "e2", repetiteurId: "t1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", titre: "Maîtriser le raisonnement par récurrence", progression: 45, dateEcheance: "2026-09-01" },
];

export const autoEvaluationsSeed: AutoEvaluation[] = [
  { id: "ae1", eleveId: "e1", seanceId: "s1", moment: "avant", chapitre: "Équations du second degré", ressenti: "pas_a_l_aise", date: "2026-06-29" },
  { id: "ae2", eleveId: "e1", seanceId: "s1", moment: "apres", chapitre: "Équations du second degré", ressenti: "a_l_aise", date: "2026-06-29" },
  { id: "ae3", eleveId: "e1", seanceId: "s2", moment: "avant", chapitre: "Present Perfect", ressenti: "a_l_aise", date: "2026-07-01" },
];
