import type { Paiement } from "./types";

export const paiements: Paiement[] = [
  { id: "pay1", parentId: "p1", eleveId: "e1", montant: 240, date: "2026-05-01", motif: "Forfait mensuel - Mai", statut: "paye" },
  { id: "pay2", parentId: "p1", eleveId: "e1", montant: 240, date: "2026-06-01", motif: "Forfait mensuel - Juin", statut: "paye" },
  { id: "pay3", parentId: "p1", eleveId: "e1", montant: 240, date: "2026-07-01", motif: "Forfait mensuel - Juillet", statut: "en_attente" },
  { id: "pay4", parentId: "p2", eleveId: "e2", montant: 200, date: "2026-06-01", motif: "Forfait mensuel - Juin", statut: "paye" },
  { id: "pay5", parentId: "p2", eleveId: "e2", montant: 200, date: "2026-07-01", motif: "Forfait mensuel - Juillet", statut: "en_retard" },
  { id: "pay6", parentId: "p2", eleveId: "e3", montant: 160, date: "2026-06-01", motif: "Forfait mensuel - Juin", statut: "paye" },
  { id: "pay7", parentId: "p2", eleveId: "e3", montant: 160, date: "2026-07-01", motif: "Forfait mensuel - Juillet", statut: "en_attente" },
  { id: "pay8", parentId: "p3", eleveId: "e4", montant: 280, date: "2026-06-01", motif: "Forfait mensuel - Juin", statut: "paye" },
  { id: "pay9", parentId: "p3", eleveId: "e4", montant: 280, date: "2026-07-01", motif: "Forfait mensuel - Juillet", statut: "paye" },
];

export function getPaiementsByParent(parentId: string): Paiement[] {
  return paiements.filter((p) => p.parentId === parentId).sort((a, b) => b.date.localeCompare(a.date));
}

export function getPaiementsByEleve(eleveId: string): Paiement[] {
  return paiements.filter((p) => p.eleveId === eleveId).sort((a, b) => b.date.localeCompare(a.date));
}
