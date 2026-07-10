"use client";

import { useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import type { Classe, Serie } from "@/lib/mock";

const PAR_PAGE = 20;
const CLASSES: Classe[] = ["2nde", "1ère", "Tle"];
const SERIES: Serie[] = ["A", "C", "D", "SES"];

export default function AdminElevesPage() {
  const { eleves, getMatiere, getMatieresActives, getRepetiteur, getParent, assignerMatiereEleve } = useStore();
  const [recherche, setRecherche] = useState("");
  const [classe, setClasse] = useState<string>("toutes");
  const [serie, setSerie] = useState<string>("toutes");
  const [page, setPage] = useState(1);
  const [eleveOuvertId, setEleveOuvertId] = useState<string | null>(null);

  const filtres = eleves.filter((e) => {
    const matchRecherche = `${e.prenom} ${e.nom}`.toLowerCase().includes(recherche.toLowerCase());
    const matchClasse = classe === "toutes" || e.classe === classe;
    const matchSerie = serie === "toutes" || e.serie === serie;
    return matchRecherche && matchClasse && matchSerie;
  });
  const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageActuelle = Math.min(page, nbPages);
  const visibles = filtres.slice((pageActuelle - 1) * PAR_PAGE, pageActuelle * PAR_PAGE);
  const eleveOuvert = eleveOuvertId ? eleves.find((e) => e.id === eleveOuvertId) ?? null : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Élèves</h1>
        <p className="text-sm text-muted-foreground">{eleves.length} élève(s) inscrit(s) — recherche, filtre, gestion des matières suivies.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              placeholder="Nom ou prénom..."
              className="pl-8"
            />
          </div>
          <Select items={{ toutes: "Toutes classes", ...Object.fromEntries(CLASSES.map((c) => [c, c])) }} value={classe} onValueChange={(v) => { if (v) { setClasse(v); setPage(1); } }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes classes</SelectItem>
              {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select items={{ toutes: "Toutes séries", ...Object.fromEntries(SERIES.map((s) => [s, s])) }} value={serie} onValueChange={(v) => { if (v) { setSerie(v); setPage(1); } }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes séries</SelectItem>
              {SERIES.map((s) => <SelectItem key={s} value={s}>Série {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {visibles.length === 0 ? (
            <EmptyState icon={Search} title="Aucun élève trouvé" hint="Ajuste la recherche ou les filtres." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe / Série</TableHead>
                    <TableHead>Matières suivies</TableHead>
                    <TableHead>Répétiteur(s)</TableHead>
                    <TableHead>Parent(s)</TableHead>
                    <TableHead className="text-right">Gérer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((eleve) => (
                    <TableRow key={eleve.id}>
                      <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                      <TableCell>{eleve.classe} · {eleve.serie}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {eleve.matiereIds.length === 0 && <span className="text-xs text-muted-foreground">Aucune</span>}
                          {eleve.matiereIds.map((id) => <Badge key={id} variant="secondary">{getMatiere(id)?.nom}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {eleve.repetiteurIds.map((id) => getRepetiteur(id)).filter(Boolean).map((r) => `${r!.prenom} ${r!.nom}`).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {eleve.parentIds.map((id) => getParent(id)).filter(Boolean).map((p) => `${p!.prenom} ${p!.nom}`).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEleveOuvertId(eleve.id)}>
                          <Settings2 /> Matières
                        </Button>
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

      <Dialog open={!!eleveOuvert} onOpenChange={(open) => !open && setEleveOuvertId(null)}>
        <DialogContent className="sm:max-w-md">
          {eleveOuvert && (
            <MatieresDialogContent
              eleve={eleveOuvert}
              matieresActives={getMatieresActives(eleveOuvert.serie)}
              onToggle={async (matiereId, assigner) => {
                try {
                  await assignerMatiereEleve(eleveOuvert.id, matiereId, assigner);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Échec de la mise à jour");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatieresDialogContent({
  eleve,
  matieresActives,
  onToggle,
}: {
  eleve: { id: string; nom: string; prenom: string; matiereIds: string[] };
  matieresActives: { id: string; nom: string }[];
  onToggle: (matiereId: string, assigner: boolean) => Promise<void>;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{eleve.prenom} {eleve.nom}</DialogTitle>
        <DialogDescription>Matières suivies — coché = suivi par cet élève.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-3">
        {matieresActives.map((m) => (
          <label key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <Checkbox
              checked={eleve.matiereIds.includes(m.id)}
              onCheckedChange={(checked) => onToggle(m.id, checked === true)}
            />
            {m.nom}
          </label>
        ))}
      </div>
    </>
  );
}
