"use client";

import { createClient } from "@/utils/supabase/client";

/**
 * Module révision : entraînement illimité par matière/chapitre, zéro point
 * de classement. Même principe anti-fuite que les défis : les questions
 * arrivent sans réponse via RPC, la correction se fait côté serveur et
 * alimente la maîtrise par chapitre (fenêtre des 20 dernières réponses).
 */

export interface QuestionRevision {
  id: string;
  question: string;
  choix: string[];
  chapitre: string;
}

export interface ResultatRevision {
  score: number;
  corrections: number[];
}

export interface ChapitreDisponible {
  chapitre: string;
  nbQuestions: number;
}

export interface MaitriseChapitre {
  matiereId: string;
  chapitre: string;
  nbRepondues: number;
  nbCorrectes: number;
  pct: number;
}

export async function getChapitres(matiereId: string): Promise<ChapitreDisponible[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_chapitres", { p_matiere_id: matiereId });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    chapitre: r.chapitre as string,
    nbQuestions: r.nb_questions as number,
  }));
}

export async function demarrerRevision(
  matiereId: string,
  chapitre: string | null = null,
  nb = 10
): Promise<QuestionRevision[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("demarrer_revision", {
    p_matiere_id: matiereId,
    p_chapitre: chapitre,
    p_nb: nb,
  });
  if (error || !data) return [];
  return data as QuestionRevision[];
}

export async function soumettreRevision(questionIds: string[], reponses: number[]): Promise<ResultatRevision> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("soumettre_revision", {
    p_question_ids: questionIds,
    p_reponses: reponses,
  });
  if (error || !data) throw new Error(error?.message ?? "Échec de la soumission.");
  const r = data as Record<string, unknown>;
  return { score: r.score as number, corrections: r.corrections as number[] };
}

export async function getMaitrise(): Promise<MaitriseChapitre[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_maitrise");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    matiereId: r.matiere_id as string,
    chapitre: r.chapitre as string,
    nbRepondues: r.nb_repondues as number,
    nbCorrectes: r.nb_correctes as number,
    pct: r.pct as number,
  }));
}

export interface MaitriseEleveChapitre extends MaitriseChapitre {
  eleveId: string;
}

/** Équivalent de getMaitrise(), côté répétiteur : renvoie la maîtrise de
 *  TOUS ses élèves assignés (pas seulement l'utilisateur courant). */
export async function getMaitriseEleves(): Promise<MaitriseEleveChapitre[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_maitrise_eleves");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    eleveId: r.eleve_id as string,
    matiereId: r.matiere_id as string,
    chapitre: r.chapitre as string,
    nbRepondues: r.nb_repondues as number,
    nbCorrectes: r.nb_correctes as number,
    pct: r.pct as number,
  }));
}
