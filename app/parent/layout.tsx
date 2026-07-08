import { AppShell } from "@/components/shared/app-shell";
import { getParent, CURRENT_PARENT_ID } from "@/lib/mock";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const parent = getParent(CURRENT_PARENT_ID)!;
  return (
    <AppShell
      role="parent"
      userLabel={`${parent.prenom} ${parent.nom}`}
      userInitiales={`${parent.prenom[0]}${parent.nom[0]}`}
    >
      {children}
    </AppShell>
  );
}
