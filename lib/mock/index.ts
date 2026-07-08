export * from "./types";
export * from "./current";
export * from "./utilisateurs";
export * from "./seances";
export * from "./evaluations";
export * from "./paiements";
export * from "./exercices";
export * from "./assignations";
export * from "./soumissions";
export * from "./ressources";
export * from "./messages";
export * from "./badges";

import { getEleve } from "./utilisateurs";

export function getNomComplet(idOrEntity: { prenom: string; nom: string } | string): string {
  if (typeof idOrEntity === "string") {
    const eleve = getEleve(idOrEntity);
    return eleve ? `${eleve.prenom} ${eleve.nom}` : idOrEntity;
  }
  return `${idOrEntity.prenom} ${idOrEntity.nom}`;
}

export const AUJOURDHUI = "2026-07-05";
export const ANNEE_SCOLAIRE = "2025-2026";
