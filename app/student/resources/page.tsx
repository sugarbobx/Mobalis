"use client";

import { FileText, BookOpen, ScrollText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import type { Ressource } from "@/lib/mock";

const CATEGORIES: { value: Ressource["type"]; label: string }[] = [
  { value: "cours", label: "Cours" },
  { value: "ancienne_epreuve", label: "Anciennes épreuves" },
];

export default function StudentResourcesPage() {
  const { getEleve } = useStore();
  const CURRENT_STUDENT_ID = useCurrentUser().id;
  const eleve = getEleve(CURRENT_STUDENT_ID);
  if (!eleve) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ressources</h1>
        <p className="text-sm text-muted-foreground">
          Cours et anciennes épreuves partagés par tes répétiteurs, classés par catégorie et par matière.
        </p>
      </div>

      <Tabs defaultValue="toutes">
        <TabsList>
          <TabsTrigger value="toutes">Toutes</TabsTrigger>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="toutes" className="mt-4">
          <RessourcesParMatiere matiereIds={eleve.matiereIds} />
        </TabsContent>
        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value} className="mt-4">
            <RessourcesParMatiere matiereIds={eleve.matiereIds} categorie={c.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function RessourcesParMatiere({ matiereIds, categorie }: { matiereIds: string[]; categorie?: Ressource["type"] }) {
  const { getMatiere, getRessourcesByMatiere } = useStore();
  const sections = matiereIds
    .map((matiereId) => ({
      matiereId,
      ressources: getRessourcesByMatiere(matiereId).filter((r) => !categorie || r.type === categorie),
    }))
    .filter((s) => s.ressources.length > 0);

  if (sections.length === 0) {
    return <EmptyState icon={FileText} title="Aucune ressource disponible" hint="Les ressources partagées par tes répétiteurs apparaîtront ici." />;
  }

  return (
    <div className="space-y-6">
      {sections.map(({ matiereId, ressources }) => (
        <div key={matiereId} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{getMatiere(matiereId)?.nom}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ressources.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {r.type === "cours" ? <BookOpen className="size-3" /> : <ScrollText className="size-3" />}
                      {r.type === "cours" ? "Cours" : "Ancienne épreuve"}
                    </Badge>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4 text-primary" /> {r.titre}
                  </CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
