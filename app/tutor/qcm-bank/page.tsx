"use client";

import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { QcmBanqueExplorer } from "@/components/shared/qcm-banque-explorer";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

export default function TutorQcmBankPage() {
  const { getRepetiteur, getMatiere, derniereSyncAt } = useStore();
  const repetiteurId = useCurrentUser().id;
  const tutor = getRepetiteur(repetiteurId);
  const mesMatieres = (tutor?.matiereIds ?? []).map((id) => getMatiere(id)).filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Banque QCM</h1>
        <p className="text-sm text-muted-foreground">
          QCM de tes matières — énoncé et bonne réponse, pour vérifier le contenu avant qu&apos;il serve dans un défi.
        </p>
      </div>

      {derniereSyncAt === null ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : mesMatieres.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucune matière assignée" hint="Contacte l'administration pour te faire assigner une matière." />
      ) : (
        <QcmBanqueExplorer matieres={mesMatieres} />
      )}
    </div>
  );
}
