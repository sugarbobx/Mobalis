"use server";

import { createAdminClient } from "@/utils/supabase/admin";

const FENETRE_INSCRIPTION_MS = 10 * 60 * 1000; // 10 min entre signUp() et creerCentre()

/**
 * Crée le centre + le profil admin liés au compte auth qui vient d'être créé
 * côté client via supabase.auth.signUp() (clé anon, aucun service_role
 * exposé au navigateur). Cette action utilise le service_role pour insérer
 * centres/admins — l'utilisateur n'a pas encore de ligne admins donc RLS ne
 * pourrait l'autoriser à le faire lui-même.
 *
 * userId vient du client (pas de session serveur exploitable : avec la
 * confirmation email activée, signUp() ne pose aucun cookie de session tant
 * que l'email n'est pas confirmé — impossible de dériver l'identité via
 * auth.getUser() côté serveur à ce stade). Pour empêcher qu'un appel forgé
 * lie un centre au compte d'un tiers déjà existant, on vérifie ici que ce
 * userId correspond bien à un compte auth fraîchement créé (< 10 min), avec
 * l'email exact fourni, et sans AUCUN profil (admin/tuteur/parent/élève)
 * préexistant.
 */
export async function creerCentre(
  nomCentre: string,
  ville: string,
  userId: string,
  email: string,
  nomAdmin: string,
  prenomAdmin: string
) {
  if (!nomCentre.trim()) throw new Error("Le nom du centre est requis.");
  if (!nomAdmin.trim() || !prenomAdmin.trim()) throw new Error("Ton nom et prénom sont requis.");

  const admin = createAdminClient();

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
  if (authUserError || !authUser.user) throw new Error("Compte introuvable.");
  if (authUser.user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("Compte invalide.");
  }
  const ageMs = Date.now() - new Date(authUser.user.created_at).getTime();
  if (ageMs > FENETRE_INSCRIPTION_MS) {
    throw new Error("Session d'inscription expirée — recommence.");
  }

  // Garde-fou : ce user_id ne doit avoir AUCUN profil existant, quel que
  // soit le rôle — sinon un userId d'un compte réel (déjà tuteur/parent/
  // élève/admin) pourrait se faire lier à un centre bidon.
  const [{ data: admExistant }, { data: repExistant }, { data: parExistant }, { data: eleExistant }] = await Promise.all([
    admin.from("admins").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("repetiteurs").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("parents").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("eleves").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (admExistant || repExistant || parExistant || eleExistant) {
    throw new Error("Ce compte a déjà un profil associé.");
  }

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
