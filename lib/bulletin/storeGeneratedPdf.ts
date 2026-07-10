import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "bulletin sequentiel";

/**
 * Télécharge le PDF depuis l'URL renvoyée par APITemplate.io, l'upload dans
 * le bucket privé au chemin {eleveId}/{sequenceId}.pdf, puis upsert la ligne
 * bulletin_pdfs correspondante. Utilise le client service_role : n'appeler
 * que côté serveur, après que l'appelant a déjà vérifié l'autorisation de
 * l'utilisateur courant sur ce bulletin précis.
 */
export async function storeGeneratedPdf(
  eleveId: string,
  sequenceId: string,
  pdfUrl: string,
  genereParUserId: string | null
): Promise<{ storagePath: string }> {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error("Échec du téléchargement du PDF généré.");
  const buffer = Buffer.from(await res.arrayBuffer());

  const storagePath = `${eleveId}/${sequenceId}.pdf`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw new Error(`Échec de l'upload du bulletin : ${uploadError.message}`);

  const { error: dbError } = await admin.from("bulletin_pdfs").upsert(
    { eleve_id: eleveId, sequence_id: sequenceId, storage_path: storagePath, genere_par: genereParUserId },
    { onConflict: "eleve_id,sequence_id" }
  );
  if (dbError) throw new Error(`Échec de l'enregistrement du bulletin : ${dbError.message}`);

  return { storagePath };
}
