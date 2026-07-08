import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  // paiements
  paye: "bg-emerald-500/15 text-emerald-400",
  en_attente: "bg-amber-500/15 text-amber-400",
  en_retard: "bg-red-500/15 text-red-400",
  // séances
  a_venir: "bg-primary/15 text-primary",
  terminee: "bg-emerald-500/15 text-emerald-400",
  annulee: "bg-muted text-muted-foreground",
  // assignations / soumissions
  a_faire: "bg-amber-500/15 text-amber-400",
  fait: "bg-primary/15 text-primary",
  corrige: "bg-emerald-500/15 text-emerald-400",
  auto_corrige: "bg-emerald-500/15 text-emerald-400",
  en_attente_correction: "bg-amber-500/15 text-amber-400",
  corrige_manuellement: "bg-emerald-500/15 text-emerald-400",
  // matières
  actif: "bg-emerald-500/15 text-emerald-400",
  inactif: "bg-muted text-muted-foreground",
  // demandes d'aide
  ouverte: "bg-amber-500/15 text-amber-400",
  traitee: "bg-emerald-500/15 text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  paye: "Payé",
  en_attente: "En attente",
  en_retard: "En retard",
  a_venir: "À venir",
  terminee: "Terminée",
  annulee: "Annulée",
  a_faire: "À faire",
  fait: "Fait",
  corrige: "Corrigé",
  auto_corrige: "Corrigé (auto)",
  en_attente_correction: "En attente de correction",
  corrige_manuellement: "Corrigé",
  actif: "Actif",
  inactif: "Inactif",
  ouverte: "Ouverte",
  traitee: "Traitée",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
