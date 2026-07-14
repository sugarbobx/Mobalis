"use client";

import { createClient } from "@/utils/supabase/client";
import type { Classe, Serie } from "./mock/types";

/**
 * Accès à la banque QCM globale (exercices/exercice_choix/exercice_difficulte_serie,
 * centre_id IS NULL, migration 0022) et au pont vers les défis (defi_exercices,
 * migration 0024). Volontairement HORS du store/fetchAll — même doctrine que
 * lib/defis.ts : ces 5000+ lignes n'ont pas leur place dans le store général.
 */

export type Difficulte = "facile" | "moyen" | "difficile" | "genius";
export type TypeDefi = "hebdo" | "mensuel";

export interface QcmBanque {
  id: string;
  titre: string;
  enonce: string;
  matiereId: string;
  matiereNom: string;
  classe: Classe;
  chapitreNom: string;
  notionNom: string;
  statut: "brouillon" | "publie";
  difficultes: { serie: Serie; difficulte: Difficulte }[];
}

export interface DefiEligible {
  id: string;
  type: TypeDefi;
  titre: string;
  classe: Classe;
  matiereId: string | null;
  dateDebut: string;
  dateFin: string;
  nbQuestions: number;
  nbQcmPousses: number;
}

const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };
const CLASSE_APP_TO_DB: Record<Classe, string> = { "2nde": "2nde", "1ère": "1ere", Tle: "tle" };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Toute la banque d'une matière (filtrage classe/chapitre/difficulté/série fait côté appelant). */
export async function getBanqueQcm(matiereId: string): Promise<QcmBanque[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercices")
    .select(
      "id, titre, enonce, matiere_id, statut, matieres(nom), notions(nom, chapitres(nom, classe)), exercice_difficulte_serie(serie, difficulte)"
    )
    .is("centre_id", null)
    .eq("type", "qcm")
    .eq("matiere_id", matiereId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Row[])
    .filter((r) => r.notions?.chapitres)
    .map((r) => ({
      id: r.id as string,
      titre: r.titre as string,
      enonce: r.enonce as string,
      matiereId: r.matiere_id as string,
      matiereNom: (r.matieres?.nom as string) ?? "",
      classe: CLASSE_DB_TO_APP[r.notions.chapitres.classe as string] ?? "2nde",
      chapitreNom: r.notions.chapitres.nom as string,
      notionNom: r.notions.nom as string,
      statut: r.statut as "brouillon" | "publie",
      difficultes: (r.exercice_difficulte_serie as Row[]).map((d) => ({
        serie: d.serie as Serie,
        difficulte: d.difficulte as Difficulte,
      })),
    }));
}

/**
 * Défis du centre dont la classe correspond, éligibles au push : mensuel (toujours,
 * matiere_id est null) ou hebdo de la matière unique de la sélection en cours.
 * matiereUnique = null si la sélection couvre plusieurs matières (seuls les
 * mensuels restent alors éligibles).
 */
export async function getDefisEligibles(classe: Classe, matiereUnique: string | null): Promise<DefiEligible[]> {
  const supabase = createClient();
  const classeDb = CLASSE_APP_TO_DB[classe];
  const { data, error } = await supabase
    .from("defis")
    .select("id, type, titre, classe, matiere_id, nb_questions, date_debut, date_fin, defi_exercices(exercice_id)")
    .eq("classe", classeDb)
    .order("date_debut", { ascending: false });

  if (error || !data) return [];

  return (data as Row[])
    .filter((d) => d.type === "mensuel" || d.matiere_id === matiereUnique)
    .map((d) => ({
      id: d.id as string,
      type: d.type as TypeDefi,
      titre: d.titre as string,
      classe: CLASSE_DB_TO_APP[d.classe as string] ?? classe,
      matiereId: (d.matiere_id as string | null) ?? null,
      dateDebut: d.date_debut as string,
      dateFin: d.date_fin as string,
      nbQuestions: d.nb_questions as number,
      nbQcmPousses: (d.defi_exercices as Row[]).length,
    }));
}

/** Pousse les QCM sélectionnés vers un défi existant (idempotent — repousser ne duplique rien). */
export async function pousserQcmVersDefi(defiId: string, exerciceIds: string[]): Promise<void> {
  if (exerciceIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("defi_exercices")
    .upsert(
      exerciceIds.map((exercice_id) => ({ defi_id: defiId, exercice_id })),
      { onConflict: "defi_id,exercice_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}
