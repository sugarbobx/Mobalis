"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";

const PAR_PAGE = 20;

export default function AdminRepetiteursPage() {
  const { repetiteurs, getMatiere, getEleve } = useStore();
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);

  const filtres = repetiteurs.filter((r) => `${r.prenom} ${r.nom}`.toLowerCase().includes(recherche.toLowerCase()));
  const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageActuelle = Math.min(page, nbPages);
  const visibles = filtres.slice((pageActuelle - 1) * PAR_PAGE, pageActuelle * PAR_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Répétiteurs</h1>
        <p className="text-sm text-muted-foreground">{repetiteurs.length} répétiteur(s) — matières enseignées et élèves suivis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              placeholder="Nom ou prénom..."
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {visibles.length === 0 ? (
            <EmptyState icon={Search} title="Aucun répétiteur trouvé" hint="Ajuste la recherche." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Répétiteur</TableHead>
                    <TableHead>Matières enseignées</TableHead>
                    <TableHead>Élèves suivis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell className="font-medium">{rep.prenom} {rep.nom}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rep.matiereIds.map((id) => <Badge key={id} variant="secondary">{getMatiere(id)?.nom}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rep.eleveIds.map((id) => getEleve(id)).filter(Boolean).map((e) => `${e!.prenom} ${e!.nom}`).join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {nbPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Page {pageActuelle} / {nbPages} — {filtres.length} résultat(s)</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pageActuelle <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                    <Button variant="outline" size="sm" disabled={pageActuelle >= nbPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
