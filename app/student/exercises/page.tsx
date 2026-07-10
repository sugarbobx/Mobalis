"use client";

import Link from "next/link";
import { ListChecks, PenLine } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

type Devoirs = ReturnType<ReturnType<typeof useStore>["getDevoirsByEleve"]>;

export default function StudentExercisesPage() {
  const { getDevoirsByEleve } = useStore();
  const devoirs = getDevoirsByEleve(useCurrentUser().id);
  const aFaire = devoirs.filter((d) => d.assignation.statut === "a_faire");
  const enCours = devoirs.filter((d) => d.assignation.statut === "fait");
  const corriges = devoirs.filter((d) => d.assignation.statut === "corrige");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Exercices</h1>
        <p className="text-sm text-muted-foreground">
          QCM à correction automatique ou exercices à réponse libre, à faire directement ici.
        </p>
      </div>

      <Tabs defaultValue="a_faire">
        <TabsList>
          <TabsTrigger value="a_faire">À faire ({aFaire.length})</TabsTrigger>
          <TabsTrigger value="en_cours">En attente de correction ({enCours.length})</TabsTrigger>
          <TabsTrigger value="corriges">Corrigés ({corriges.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="a_faire" className="mt-4">
          <ExerciceList devoirs={aFaire} action="Faire l'exercice" />
        </TabsContent>
        <TabsContent value="en_cours" className="mt-4">
          <ExerciceList devoirs={enCours} action="Voir ma soumission" />
        </TabsContent>
        <TabsContent value="corriges" className="mt-4">
          <ExerciceList devoirs={corriges} action="Voir le résultat" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExerciceList({
  devoirs,
  action,
}: {
  devoirs: Devoirs;
  action: string;
}) {
  if (devoirs.length === 0) {
    return <p className="text-sm text-muted-foreground">Rien ici pour le moment.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {devoirs.map((d) => (
        <Card key={d.assignation.id}>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={d.exercice.type === "qcm" ? "default" : "secondary"} className="gap-1">
                {d.exercice.type === "qcm" ? <ListChecks className="size-3" /> : <PenLine className="size-3" />}
                {d.exercice.type === "qcm" ? "QCM" : "Réponse libre"}
              </Badge>
              <Badge variant="outline">{d.matiere.nom}</Badge>
            </div>
            <div>
              <p className="font-medium">{d.exercice.titre}</p>
              <p className="text-sm text-muted-foreground">Échéance : {d.assignation.dateEcheance}</p>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge status={d.assignation.statut} />
              {typeof d.assignation.score === "number" && (
                <span className="text-sm font-semibold text-primary">{d.assignation.score}/100</span>
              )}
            </div>
            <Link href={`/student/exercises/${d.assignation.id}`} className={buttonVariants({ size: "sm", className: "w-full" })}>
              {action}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
