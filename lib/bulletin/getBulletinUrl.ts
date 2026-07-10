import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "bulletin sequentiel";
const EXPIRATION_SECONDS = 5 * 60;

/**
 * Signe une URL temporaire vers un bulletin déjà stocké. N'effectue AUCUNE
 * vérification d'autorisation elle-même — utilise le client service_role,
 * qui contourne les RLS de storage.objects. À appeler uniquement après que
 * l'appelant a déjà confirmé que l'utilisateur courant a le droit de voir
 * ce bulletin précis (ex. le RPC get_bulletin_sequence, appelé en amont
 * dans genererBulletinSequencePdf, a déjà fait cette vérification).
 */
export async function getBulletinUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, EXPIRATION_SECONDS);
  if (error || !data) throw new Error(`Échec de la génération de l'URL signée : ${error?.message}`);
  return data.signedUrl;
}
