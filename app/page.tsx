import Link from "next/link";
import { GraduationCap, LineChart, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const ROLES = [
  {
    label: "Administration",
    description: "Inscriptions, répétiteurs, matières, paiements et bibliothèque d'exercices.",
    icon: ShieldCheck,
  },
  {
    label: "Répétiteur",
    description: "Cahier de texte, appel, notes, création et correction d'exercices.",
    icon: Users,
  },
  {
    label: "Parent",
    description: "Suivi du retour sur investissement : notes, remarques, paiements.",
    icon: LineChart,
  },
  {
    label: "Élève",
    description: "Emploi du temps, devoirs, exercices interactifs, messagerie et progression.",
    icon: GraduationCap,
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
      <div className="mb-12 flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)]">
          MB
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">MOBALIS</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Plateforme de gestion pour centre de répétition scolaire. Connecte-toi avec ton compte
            pour accéder à ton espace.
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {ROLES.map((role) => (
          <Card key={role.label} className="h-full justify-between">
            <CardHeader>
              <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[0_0_18px_-8px_var(--primary)]">
                <role.icon className="size-5" />
              </span>
              <CardTitle className="text-base">{role.label}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Link href="/login" className={buttonVariants({ className: "mt-10 w-full max-w-xs" })}>
        Se connecter
      </Link>
      <Link href="/inscription" className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Créer un compte pour mon centre
      </Link>

      <Link href="/politique-confidentialite" className="mt-10 text-xs text-muted-foreground underline-offset-4 hover:underline">
        Politique de confidentialité
      </Link>
    </div>
  );
}
