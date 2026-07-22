"use client";

import { createClient } from "@/utils/supabase/client";

/**
 * Soumission d'un exercice (QCM auto-corrigé ou réponse libre) côté élève.
 * Score calculé et assignation/soumission écrites côté serveur (RPC security
 * definer, migration 0027) — jamais côté client, qui ne voit jamais
 * bonneReponseIndex avant d'avoir répondu (voir lib/store.ts, vue
 * exercices_client).
 */
export interface ResultatSoumissionExercice {
  score: number | null;
  /** index de la bonne réponse par question, révélé après soumission (QCM uniquement) */
  corrections: number[];
}

export async function soumettreExerciceQcm(
  assignationId: string,
  reponses: number[]
): Promise<ResultatSoumissionExercice> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("soumettre_exercice", {
    p_assignation_id: assignationId,
    p_reponses: reponses,
  });
  if (error || !data) throw new Error(error?.message ?? "Échec de la soumission.");
  const r = data as Record<string, unknown>;
  return { score: r.score as number, corrections: (r.corrections as number[]) ?? [] };
}

export async function soumettreExerciceLibre(assignationId: string, reponseLibre: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("soumettre_exercice", {
    p_assignation_id: assignationId,
    p_reponse_libre: reponseLibre,
  });
  if (error) throw new Error(error.message);
}
