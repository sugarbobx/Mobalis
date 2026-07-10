import { AppShell } from "@/components/shared/app-shell";
import { createClient } from "@/utils/supabase/server";
import { CurrentUserProvider } from "@/lib/current-user-context";
import { ConsentGate } from "@/components/parent/consent-gate";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: parent } = user
    ? await supabase.from("parents").select("id, nom, prenom").eq("user_id", user.id).single()
    : { data: null };

  return (
    <CurrentUserProvider value={parent ?? { id: "", nom: "", prenom: "" }}>
      <AppShell
        role="parent"
        userLabel={parent ? `${parent.prenom} ${parent.nom}` : ""}
        userInitiales={parent ? `${parent.prenom[0]}${parent.nom[0]}` : ""}
      >
        <ConsentGate>{children}</ConsentGate>
      </AppShell>
    </CurrentUserProvider>
  );
}
