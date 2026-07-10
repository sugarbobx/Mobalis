"use client";

import { createClient } from "@/utils/supabase/client";

export interface Sequence {
  id: string;
  libelle: string;
  ordre: number;
  anneeScolaire: string;
}

export async function getSequences(): Promise<Sequence[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sequences")
    .select("id, libelle, ordre, annee_scolaire")
    .order("ordre");
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, libelle: r.libelle, ordre: r.ordre, anneeScolaire: r.annee_scolaire }));
}
