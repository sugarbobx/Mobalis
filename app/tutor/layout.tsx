import { AppShell } from "@/components/shared/app-shell";
import { getRepetiteur, CURRENT_TUTOR_ID } from "@/lib/mock";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const tutor = getRepetiteur(CURRENT_TUTOR_ID)!;
  return (
    <AppShell
      role="tutor"
      userLabel={`${tutor.prenom} ${tutor.nom}`}
      userInitiales={tutor.avatarInitiales}
    >
      {children}
    </AppShell>
  );
}
