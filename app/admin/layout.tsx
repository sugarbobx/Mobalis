import { AppShell } from "@/components/shared/app-shell";
import { createClient } from "@/utils/supabase/server";
import { CurrentUserProvider } from "@/lib/current-user-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: admin } = user
    ? await supabase.from("admins").select("id, nom, prenom").eq("user_id", user.id).single()
    : { data: null };

  return (
    <CurrentUserProvider value={admin ?? { id: "", nom: "", prenom: "" }}>
      <AppShell
        role="admin"
        userLabel={admin ? `${admin.prenom} ${admin.nom}` : ""}
        userInitiales={admin ? `${admin.prenom[0]}${admin.nom[0]}` : ""}
      >
        {children}
      </AppShell>
    </CurrentUserProvider>
  );
}
