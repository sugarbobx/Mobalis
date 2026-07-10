"use server";

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Crée le centre + le profil admin liés au compte auth qui vient d'être créé
 * côté client via supabase.auth.signUp() (clé anon, aucun service_role
 * exposé au navigateur). Cette action utilise le service_role uniquement
 * pour insérer centres/admins — l'utilisateur n'a pas encore de ligne admins
 * donc RLS ne pourrait l'autoriser à le faire lui-même.
 */
export async function creerCentre(
  nomCentre: string,
  ville: string,
  userId: string,
  nomAdmin: string,
  prenomAdmin: string
) {
  if (!nomCentre.trim()) throw new Error("Le nom du centre est requis.");
  if (!nomAdmin.trim() || !prenomAdmin.trim()) throw new Error("Ton nom et prénom sont requis.");

  const admin = createAdminClient();

  // Garde-fou double soumission : un user_id ne peut avoir qu'un seul profil admin.
  const { data: existant } = await admin.from("admins").select("id").eq("user_id", userId).maybeSingle();
  if (existant) throw new Error("Ce compte a déjà un centre associé.");

  const { data: centre, error: centreError } = await admin
    .from("centres")
    .insert({ nom: nomCentre.trim(), ville: ville.trim() || null })
    .select()
    .single();
  if (centreError || !centre) throw new Error(centreError?.message ?? "Échec de création du centre.");

  const { error: adminError } = await admin.from("admins").insert({
    user_id: userId,
    centre_id: centre.id,
    nom: nomAdmin.trim(),
    prenom: prenomAdmin.trim(),
  });
  if (adminError) {
    // Rollback manuel : évite un centre orphelin sans admin si l'insert échoue.
    await admin.from("centres").delete().eq("id", centre.id);
    throw new Error(adminError.message);
  }

  return { centreId: centre.id };
}
