"use client";

import { FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRessourcesByMatiere, CURRENT_STUDENT_ID } from "@/lib/mock";
import { useStore } from "@/lib/store";

const TYPE_LABELS: Record<string, string> = {
  fiche: "Fiche",
  resume: "Résumé",
  correction: "Correction",
};

export default function StudentResourcesPage() {
  const { getMatiere, getEleve } = useStore();
  const eleve = getEleve(CURRENT_STUDENT_ID)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ressources</h1>
        <p className="text-sm text-muted-foreground">
          Fiches, résumés et corrections partagés par tes répétiteurs, filtrables par matière.
        </p>
      </div>

      <Tabs defaultValue="tous">
        <TabsList>
          <TabsTrigger value="tous">Toutes</TabsTrigger>
          {eleve.matiereIds.map((id) => (
            <TabsTrigger key={id} value={id}>{getMatiere(id)?.nom}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="tous" className="mt-4">
          <RessourceGrid matiereIds={eleve.matiereIds} />
        </TabsContent>
        {eleve.matiereIds.map((id) => (
          <TabsContent key={id} value={id} className="mt-4">
            <RessourceGrid matiereIds={[id]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function RessourceGrid({ matiereIds }: { matiereIds: string[] }) {
  const { getMatiere } = useStore();
  const ressources = matiereIds.flatMap((id) => getRessourcesByMatiere(id));
  if (ressources.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune ressource disponible.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ressources.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getMatiere(r.matiereId)?.nom}</Badge>
              <Badge variant="secondary">{TYPE_LABELS[r.type]}</Badge>
            </div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" /> {r.titre}
            </CardTitle>
            <CardDescription>{r.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
