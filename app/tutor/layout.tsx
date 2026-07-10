import { AppShell } from "@/components/shared/app-shell";
import { createClient } from "@/utils/supabase/server";
import { CurrentUserProvider } from "@/lib/current-user-context";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tutor } = user
    ? await supabase.from("repetiteurs").select("id, nom, prenom, avatar_initiales").eq("user_id", user.id).single()
    : { data: null };

  return (
    <CurrentUserProvider value={tutor ?? { id: "", nom: "", prenom: "" }}>
      <AppShell
        role="tutor"
        userLabel={tutor ? `${tutor.prenom} ${tutor.nom}` : ""}
        userInitiales={tutor?.avatar_initiales ?? ""}
      >
        {children}
      </AppShell>
    </CurrentUserProvider>
  );
}
