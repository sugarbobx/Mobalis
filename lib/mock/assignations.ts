import type { Assignation } from "./types";

// Seed data only — consume via @/lib/store's useStore().
export const assignationsSeed: Assignation[] = [
  { id: "a1", exerciceId: "ex1", eleveIds: ["e1"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-28", dateEcheance: "2026-07-10", statut: "a_faire" },
  { id: "a2", exerciceId: "ex2", eleveIds: ["e1"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-10", dateEcheance: "2026-06-20", statut: "fait" },
  { id: "a3", exerciceId: "ex3", eleveIds: ["e1"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-15", dateEcheance: "2026-06-25", statut: "corrige", score: 100 },
  { id: "a4", exerciceId: "ex4", eleveIds: ["e1"], repetiteurAssignantId: "t2", dateAssignation: "2026-06-10", dateEcheance: "2026-06-20", statut: "corrige", score: 50 },
  { id: "a5", exerciceId: "ex5", eleveIds: ["e1"], repetiteurAssignantId: "t2", dateAssignation: "2026-06-01", dateEcheance: "2026-06-15", statut: "corrige", score: 80 },
  { id: "a6", exerciceId: "ex1", eleveIds: ["e2"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-25", dateEcheance: "2026-07-08", statut: "a_faire" },
  { id: "a7", exerciceId: "ex6", eleveIds: ["e2"], repetiteurAssignantId: "t3", dateAssignation: "2026-06-10", dateEcheance: "2026-06-20", statut: "corrige", score: 100 },
  { id: "a8", exerciceId: "ex4", eleveIds: ["e3"], repetiteurAssignantId: "t2", dateAssignation: "2026-06-28", dateEcheance: "2026-07-09", statut: "a_faire" },
  { id: "a9", exerciceId: "ex7", eleveIds: ["e3"], repetiteurAssignantId: "t3", dateAssignation: "2026-06-15", dateEcheance: "2026-06-28", statut: "fait" },
  { id: "a10", exerciceId: "ex3", eleveIds: ["e4"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-18", dateEcheance: "2026-06-30", statut: "corrige", score: 100 },
  { id: "a11", exerciceId: "ex2", eleveIds: ["e4"], repetiteurAssignantId: "t1", dateAssignation: "2026-06-30", dateEcheance: "2026-07-12", statut: "a_faire" },
  { id: "a12", exerciceId: "ex6", eleveIds: ["e2", "e4"], repetiteurAssignantId: "t3", dateAssignation: "2026-07-01", dateEcheance: "2026-07-15", statut: "a_faire" },
];
