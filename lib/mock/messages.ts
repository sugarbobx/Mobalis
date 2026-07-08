import type { DemandeAide, Message } from "./types";

// Seed data only — consume via @/lib/store's useStore().
export const messagesSeed: Message[] = [
  { id: "m1", eleveId: "e1", repetiteurId: "t1", auteur: "eleve", contenu: "Bonjour, je n'arrive pas à retrouver la formule du discriminant, vous pouvez me la rappeler ?", date: "2026-07-02T18:10:00", lu: true },
  { id: "m2", eleveId: "e1", repetiteurId: "t1", auteur: "repetiteur", contenu: "Bien sûr Lucas : Δ = b² - 4ac. Regarde la fiche envoyée après la séance, elle reprend tout ça avec des exemples.", date: "2026-07-02T19:32:00", lu: true },
  { id: "m3", eleveId: "e1", repetiteurId: "t1", auteur: "eleve", contenu: "Merci ! Est-ce que l'exercice sur la récurrence est bien noté 'en attente' ?", date: "2026-07-03T08:05:00", lu: true },
  { id: "m4", eleveId: "e1", repetiteurId: "t1", auteur: "repetiteur", contenu: "Oui, je te corrige ça avant notre prochaine séance.", date: "2026-07-03T20:15:00", lu: false },
];

export const demandesAideSeed: DemandeAide[] = [
  { id: "d1", eleveId: "e1", matiereId: "5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", sujet: "Difficulté sur la factorisation", date: "2026-06-27", statut: "traitee" },
  { id: "d2", eleveId: "e3", matiereId: "b21ba26b-4833-4b57-914d-ff9ead59c194", sujet: "Besoin d'une séance supplémentaire avant le contrôle", date: "2026-07-01", statut: "ouverte" },
];
