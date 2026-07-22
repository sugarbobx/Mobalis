"use client";

import { createClient } from "@/utils/supabase/client";
import type { Classe } from "./mock/types";
import { dateLocaleISO } from "./dates";

/**
 * Accès aux défis QCM v2. Volontairement HORS du store/fetchAll : les
 * questions (avec réponses) ne transitent jamais vers le client — tout passe
 * par les RPC security definer de la migration 0006 : tirage individuel figé
 * au démarrage, temps mesuré serveur, scoring serveur.
 */

export type TypeDefi = "hebdo" | "mensuel";
export type StatutDefi = "a_jouer" | "en_cours" | "joue";

export interface DefiEleve {
  id: string;
  type: TypeDefi;
  titre: string;
  /** null pour un défi mensuel (toutes les matières du programme) */
  matiereId: string | null;
  pointsBase: number;
  dateDebut: string;
  dateFin: string;
  nbQuestionsTotal: number;
  statut: StatutDefi;
  score: number | null;
  points: number | null;
}

export interface QuestionDefi {
  id: string;
  question: string;
  choix: string[];
  matiere: string;
}

export interface ResultatDefi {
  score: number;
  points: number;
  bonus: number;
  tempsSecondes: number;
  /** index de la bonne réponse, par question — révélé après soumission */
  corrections: number[];
}

export interface LigneClassement {
  rang: number;
  eleveId: string;
  prenom: string;
  nomInitiale: string;
  classe: Classe;
  totalPoints: number;
  estMoi: boolean;
}

const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };

export async function getDefisEleve(): Promise<DefiEleve[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_defis_eleve");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    type: r.type as TypeDefi,
    titre: r.titre as string,
    matiereId: (r.matiere_id as string | null) ?? null,
    pointsBase: r.points_base as number,
    dateDebut: r.date_debut as string,
    dateFin: r.date_fin as string,
    nbQuestionsTotal: r.nb_questions_total as number,
    statut: r.statut as StatutDefi,
    score: (r.score as number | null) ?? null,
    points: (r.points as number | null) ?? null,
  }));
}

/** Fige le tirage individuel (ou le resert si déjà démarré) — le chrono serveur tourne dès cet appel. */
export async function demarrerDefi(defiId: string): Promise<QuestionDefi[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("demarrer_defi", { p_defi_id: defiId });
  if (error || !data) throw new Error(error?.message ?? "Impossible de démarrer le défi.");
  return data as QuestionDefi[];
}

export async function soumettreDefi(defiId: string, reponses: number[]): Promise<ResultatDefi> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("soumettre_defi", {
    p_defi_id: defiId,
    p_reponses: reponses,
  });
  if (error || !data) throw new Error(error?.message ?? "Échec de la soumission.");
  const r = data as Record<string, unknown>;
  return {
    score: r.score as number,
    points: r.points as number,
    bonus: r.bonus as number,
    tempsSecondes: r.temps_secondes as number,
    corrections: r.corrections as number[],
  };
}

function mapClassement(data: Record<string, unknown>[]): LigneClassement[] {
  return data.map((r) => ({
    rang: Number(r.rang),
    eleveId: r.eleve_id as string,
    prenom: r.prenom as string,
    nomInitiale: r.nom_initiale as string,
    classe: CLASSE_DB_TO_APP[r.classe as string],
    totalPoints: Number(r.total_points),
    estMoi: r.est_moi as boolean,
  }));
}

export async function getClassement(scope: "classe" | "centre", semaine: Date): Promise<LigneClassement[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_classement", {
    p_scope: scope,
    p_semaine: dateLocaleISO(semaine),
  });
  if (error || !data) return [];
  return mapClassement(data as Record<string, unknown>[]);
}

export async function getClassementAnnuel(scope: "classe" | "centre"): Promise<LigneClassement[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_classement_annuel", { p_scope: scope });
  if (error || !data) return [];
  return mapClassement(data as Record<string, unknown>[]);
}

/** Lundi de la semaine contenant `d` (heure locale). */
export function lundiDeLaSemaine(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = dimanche
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
