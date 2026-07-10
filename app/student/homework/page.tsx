"use client";

import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AUJOURDHUI } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

export default function StudentHomeworkPage() {
  const { getDevoirsByEleve } = useStore();
  const devoirs = getDevoirsByEleve(useCurrentUser().id).sort((a, b) =>
    a.assignation.dateEcheance.localeCompare(b.assignation.dateEcheance)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Devoirs</h1>
        <p className="text-sm text-muted-foreground">Triés par date d&apos;échéance.</p>
      </div>

      {devoirs.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CheckSquare}
              title="Aucun devoir pour l'instant"
              hint="Tes exercices assignés par tes répétiteurs apparaîtront ici."
            />
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-2">
        {devoirs.map((d) => {
          const enRetard = d.assignation.statut === "a_faire" && d.assignation.dateEcheance < AUJOURDHUI;
          return (
            <Card key={d.assignation.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.exercice.titre}</span>
                    <Badge variant="secondary">{d.matiere.nom}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Échéance : {d.assignation.dateEcheance}</p>
                </div>
                <div className="flex items-center gap-3">
                  {enRetard ? <StatusBadge status="en_retard" /> : <StatusBadge status={d.assignation.statut} />}
                  {d.assignation.statut === "a_faire" ? (
                    <Link href={`/student/exercises/${d.assignation.id}`} className={buttonVariants({ size: "sm" })}>
                      Faire l&apos;exercice
                    </Link>
                  ) : (
                    <Link href={`/student/exercises/${d.assignation.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Voir le résultat
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
