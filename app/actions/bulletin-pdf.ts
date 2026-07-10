"use server";

import { createClient } from "@/utils/supabase/server";
import { storeGeneratedPdf } from "@/lib/bulletin/storeGeneratedPdf";
import { getBulletinUrl } from "@/lib/bulletin/getBulletinUrl";

const CLASSE_DB_TO_APP: Record<string, string> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };

/**
 * Génère le PDF du bulletin séquentiel via APITemplate.io, le stocke dans
 * Supabase Storage puis renvoie une URL signée de courte durée (5 min) — pas
 * l'URL CDN brute d'APITemplate.io. L'autorisation est portée par le RPC
 * `get_bulletin_sequence` (security definer) appelé via le client Supabase
 * "normal" — RLS/vérifs internes s'appliquent, pas de service_role pour
 * cette étape. Le JSON renvoyé par le RPC est posté tel quel à APITemplate,
 * ses clés correspondant exactement aux placeholders du template.
 */
export async function genererBulletinSequencePdf(
  eleveId: string,
  sequenceId: string
): Promise<{ url: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_bulletin_sequence", {
    p_eleve_id: eleveId,
    p_sequence_id: sequenceId,
  });
  if (error || !data) throw new Error(error?.message ?? "Bulletin introuvable.");

  const payload = data as Record<string, any>;
  if (payload.eleve?.classe) {
    payload.eleve.classe = CLASSE_DB_TO_APP[payload.eleve.classe] ?? payload.eleve.classe;
  }

  const apiKey = process.env.APITEMPLATE_API_KEY;
  const templateId = process.env.APITEMPLATE_BULLETIN_TEMPLATE_ID;
  if (!apiKey || !templateId) throw new Error("Génération PDF non configurée (clé ou template manquant).");

  const res = await fetch(`https://rest.apitemplate.io/v2/create-pdf?template_id=${templateId}`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success" || !json.download_url) {
    throw new Error(json.message ?? "Échec de la génération du PDF.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { storagePath } = await storeGeneratedPdf(eleveId, sequenceId, json.download_url, user?.id ?? null);
  return { url: await getBulletinUrl(storagePath) };
}
