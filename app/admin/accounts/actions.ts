"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const TABLES = { repetiteur: "repetiteurs", parent: "parents", eleve: "eleves" } as const;
export type Role = keyof typeof TABLES;

async function assertCallerIsAdminAndGetCentre(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: adminRow } = await supabase
    .from("admins")
    .select("id, centre_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) throw new Error("Réservé à l'administration.");
  return adminRow.centre_id;
}

export async function creerCompte(role: Role, profileId: string, email: string, password: string) {
  const centreId = await assertCallerIsAdminAndGetCentre();

  // Le client service_role bypasse RLS : sans ce garde-fou, un admin d'un
  // centre pourrait lier un compte à un profil d'un autre centre.
  const admin = createAdminClient();
  const table = TABLES[role];
  const { data: profile } = await admin
    .from(table)
    .select("id, user_id, centre_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || profile.centre_id !== centreId) throw new Error("Profil introuvable dans votre centre.");
  if (profile.user_id) throw new Error("Ce profil a déjà un compte.");

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Échec de création du compte.");
  }

  const { error: linkError } = await admin.from(table).update({ user_id: created.user.id, email }).eq("id", profileId);
  if (linkError) throw new Error(linkError.message);

  revalidatePath("/admin/accounts");
}
