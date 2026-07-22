import { AppShell } from "@/components/shared/app-shell";
import { createClient } from "@/utils/supabase/server";
import { CurrentUserProvider } from "@/lib/current-user-context";
import { BadgeEvaluator } from "@/components/student/badge-evaluator";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: eleve } = user
    ? await supabase.from("eleves").select("id, nom, prenom, avatar_initiales").eq("user_id", user.id).single()
    : { data: null };

  return (
    <CurrentUserProvider value={eleve ?? { id: "", nom: "", prenom: "" }}>
      {eleve && <BadgeEvaluator eleveId={eleve.id} />}
      <AppShell
        role="student"
        userLabel={eleve ? `${eleve.prenom} ${eleve.nom}` : ""}
        userInitiales={eleve?.avatar_initiales ?? ""}
      >
        {children}
      </AppShell>
    </CurrentUserProvider>
  );
}
