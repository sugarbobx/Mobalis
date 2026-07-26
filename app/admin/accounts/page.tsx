import { createClient } from "@/utils/supabase/server";
import { RoleSection } from "./role-section";

export type Row = { id: string; nom: string; prenom: string; email: string | null; user_id: string | null };

export default async function AdminAccountsPage() {
  const supabase = await createClient();
  const [{ data: repetiteurs }, { data: parents }, { data: eleves }] = await Promise.all([
    supabase.from("repetiteurs").select("id, nom, prenom, email, user_id").order("nom"),
    supabase.from("parents").select("id, nom, prenom, email, user_id").order("nom"),
    supabase.from("eleves").select("id, nom, prenom, email, user_id").order("nom"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Comptes de connexion</h1>
        <p className="text-sm text-muted-foreground">
          Crée les identifiants de connexion pour chaque répétiteur, parent ou élève — à transmettre ensuite en personne.
        </p>
      </div>

      <RoleSection title="Répétiteurs" role="repetiteur" rows={repetiteurs ?? []} />
      <RoleSection title="Parents" role="parent" rows={parents ?? []} />
      <RoleSection title="Élèves" role="eleve" rows={eleves ?? []} />
    </div>
  );
}
