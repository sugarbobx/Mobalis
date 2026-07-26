/**
 * components/tutor/heatmap-maitrise.tsx
 *
 * "Qui a besoin d'aide où" : tableau croisé élèves (rattachés au
 * répétiteur connecté) × matières, coloré par maîtrise moyenne. Trié du
 * moins maîtrisé au plus maîtrisé pour que les élèves à prioriser
 * remontent naturellement en haut.
 *
 * Sources de données :
 *  - getElevesByRepetiteur(repetiteurId) → lib/store.ts (synchrone, dérivé
 *    de Eleve.repetiteurIds déjà chargé côté client)
 *  - getMaitriseEleves() → lib/revision.ts (RPC get_maitrise_eleves, voir
 *    supabase/migrations/0022_maitrise_repetiteur.sql — scope strictement
 *    aux élèves du répétiteur appelant, vérifié côté SQL)
 *
 * Les colonnes = matières réellement suivies par au moins un élève du
 * répétiteur (Eleve.matiereIds), pas seulement celles où il y a déjà de la
 * donnée — pour distinguer "n'a pas encore révisé cette matière" (—) de
 * "a révisé et est en difficulté" (pourcentage bas, coloré).
 */

"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { getMaitriseEleves, type MaitriseEleveChapitre } from "@/lib/revision";

function classesMaitrise(pct: number): string {
  if (pct < 40) return "bg-red-500/15 text-red-400";
  if (pct < 70) return "bg-amber-500/15 text-amber-400";
  return "bg-emerald-500/15 text-emerald-400";
}

interface LigneEleve {
  eleveId: string;
  nom: string;
  parMatiere: Record<string, number | null>;
  moyenne: number | null;
}

export function HeatmapMaitrise() {
  const { getElevesByRepetiteur, getMatiere, derniereSyncAt } = useStore();
  const repetiteurId = useCurrentUser().id;
  const eleves = getElevesByRepetiteur(repetiteurId);

  const [maitrise, setMaitrise] = useState<MaitriseEleveChapitre[] | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;
    getMaitriseEleves()
      .then((m) => {
        if (!annule) setMaitrise(m);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  // derniereSyncAt === null : le store racine (source de `eleves`) n'a pas
  // encore fini son propre fetchAll() — sans ce garde, un tableau vide
  // temporaire affiche à tort "Aucun élève rattaché" au premier rendu.
  if (chargement || derniereSyncAt === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Chargement…</CardContent>
      </Card>
    );
  }

  if (eleves.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={AlertCircle}
            title="Aucun élève rattaché"
            hint="Les élèves qui te sont assignés apparaîtront ici automatiquement."
          />
        </CardContent>
      </Card>
    );
  }

  // Colonnes = union des matières réellement suivies par ces élèves.
  const matiereIds = [...new Set(eleves.flatMap((e) => e.matiereIds))];
  const matieres = matiereIds.map((id) => getMatiere(id)).filter((m): m is NonNullable<typeof m> => !!m);

  // Agrège la maîtrise par (élève, matière) en moyenne sur les chapitres.
  const parCle = new Map<string, { total: number; n: number }>();
  (maitrise ?? []).forEach((m) => {
    const cle = `${m.eleveId}:${m.matiereId}`;
    const entree = parCle.get(cle) ?? { total: 0, n: 0 };
    entree.total += m.pct;
    entree.n += 1;
    parCle.set(cle, entree);
  });

  const lignes: LigneEleve[] = eleves
    .map((e) => {
      const parMatiere: Record<string, number | null> = {};
      let sommeMoyennes = 0;
      let nbMatieresAvecDonnees = 0;
      matieres.forEach((m) => {
        const entree = parCle.get(`${e.id}:${m.id}`);
        const pct = entree ? Math.round(entree.total / entree.n) : null;
        parMatiere[m.id] = pct;
        if (pct !== null) {
          sommeMoyennes += pct;
          nbMatieresAvecDonnees += 1;
        }
      });
      return {
        eleveId: e.id,
        nom: `${e.prenom} ${e.nom}`,
        parMatiere,
        moyenne: nbMatieresAvecDonnees > 0 ? Math.round(sommeMoyennes / nbMatieresAvecDonnees) : null,
      };
    })
    // Les moins avancés en premier ; ceux sans aucune donnée en dernier
    // (l'absence de donnée n'est pas nécessairement un signal de difficulté).
    .sort((a, b) => {
      if (a.moyenne === null && b.moyenne === null) return 0;
      if (a.moyenne === null) return 1;
      if (b.moyenne === null) return -1;
      return a.moyenne - b.moyenne;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maîtrise par élève et par matière</CardTitle>
        <CardDescription>Triés du moins avancé au plus avancé — priorise les premières lignes.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Élève</TableHead>
                {matieres.map((m) => (
                  <TableHead key={m.id} className="whitespace-nowrap text-center">
                    {m.nom}
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap text-center">Moyenne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((ligne) => (
                <TableRow key={ligne.eleveId}>
                  <TableCell className="whitespace-nowrap font-medium">{ligne.nom}</TableCell>
                  {matieres.map((m) => {
                    const pct = ligne.parMatiere[m.id];
                    return (
                      <TableCell key={m.id} className="text-center">
                        {pct === null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span
                            className={`inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ${classesMaitrise(pct)}`}
                          >
                            {pct}%
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {ligne.moyenne === null ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <span
                        className={`inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${classesMaitrise(ligne.moyenne)}`}
                      >
                        {ligne.moyenne}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-red-500/40" /> &lt; 40% — à prioriser
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-amber-500/40" /> 40–69%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500/40" /> ≥ 70%
          </span>
          <span className="flex items-center gap-1.5">— pas encore de données de révision</span>
        </div>
      </CardContent>
    </Card>
  );
}
