import { AppShell } from "@/components/shared/app-shell";
import { getEleve, CURRENT_STUDENT_ID } from "@/lib/mock";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const eleve = getEleve(CURRENT_STUDENT_ID)!;
  return (
    <AppShell
      role="student"
      userLabel={`${eleve.prenom} ${eleve.nom}`}
      userInitiales={eleve.avatarInitiales}
    >
      {children}
    </AppShell>
  );
}
