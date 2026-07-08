import { AppShell } from "@/components/shared/app-shell";
import { admin } from "@/lib/mock";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      role="admin"
      userLabel={`${admin.prenom} ${admin.nom}`}
      userInitiales={`${admin.prenom[0]}${admin.nom[0]}`}
    >
      {children}
    </AppShell>
  );
}
