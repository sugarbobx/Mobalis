"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Layers, Eye, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { getBanqueQcm, type QcmBanque, type Difficulte } from "@/lib/qcm-bank";
import type { Classe } from "@/lib/mock";

/**
 * Explorateur de la banque QCM (matière → classe/chapitre → difficulté),
 * partagé entre /admin/qcm-bank (toute la banque, sélection + publication +
 * push vers défi) et /tutor/qcm-bank (lecture seule, matières du répétiteur
 * uniquement — la RLS scope déjà getBanqueQcm côté serveur, ce composant ne
 * fait que refléter les matières qu'on lui passe).
 */

const CLASSES: Classe[] = ["2nde", "1ère", "Tle"];
const DIFFICULTES: Difficulte[] = ["facile", "moyen", "difficile", "genius"];
const DIFFICULTE_LABEL: Record<Difficulte, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
  genius: "Genius",
};

export interface QcmBanqueExplorerProps {
  matieres: { id: string; nom: string }[];
  selectionActive?: boolean;
  renderToolbar?: (ctx: { selection: string[]; qcms: QcmBanque[]; clearSelection: () => void }) => ReactNode;
}

export function QcmBanqueExplorer({ matieres, selectionActive = false, renderToolbar }: QcmBanqueExplorerProps) {
  const [matiereChoisie, setMatiereChoisie] = useState<string | null>(null);
  const matiereId = (matiereChoisie && matieres.some((m) => m.id === matiereChoisie)) ? matiereChoisie : (matieres[0]?.id ?? "");

  if (matieres.length === 0) {
    return <EmptyState icon={Layers} title="Aucune matière disponible" hint="Aucune matière à explorer pour le moment." />;
  }

  return (
    <div className="space-y-6">
      <Tabs value={matiereId} onValueChange={(v) => v && setMatiereChoisie(v)}>
        <TabsList className="flex-wrap">
          {matieres.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>
              {m.nom}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* key={matiereId} : repart d'un état neuf (filtres, sélection, chargement) à chaque changement de matière */}
      <QcmBanqueMatiere key={matiereId} matiereId={matiereId} selectionActive={selectionActive} renderToolbar={renderToolbar} />
    </div>
  );
}

function QcmBanqueMatiere({
  matiereId,
  selectionActive,
  renderToolbar,
}: {
  matiereId: string;
  selectionActive: boolean;
  renderToolbar?: (ctx: { selection: string[]; qcms: QcmBanque[]; clearSelection: () => void }) => ReactNode;
}) {
  const [classe, setClasse] = useState<Classe | "toutes">("toutes");
  const [chapitre, setChapitre] = useState<string>("toutes");

  const [qcms, setQcms] = useState<QcmBanque[]>([]);
  const [chargement, setChargement] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [qcmOuvert, setQcmOuvert] = useState<QcmBanque | null>(null);

  useEffect(() => {
    let annule = false;
    getBanqueQcm(matiereId).then((data) => {
      if (annule) return;
      setQcms(data);
      setChargement(false);
    });
    return () => {
      annule = true;
    };
  }, [matiereId]);

  const chapitresDisponibles = useMemo(() => {
    const set = new Set(qcms.filter((q) => classe === "toutes" || q.classe === classe).map((q) => q.chapitreNom));
    return Array.from(set).sort();
  }, [qcms, classe]);

  const qcmsFiltres = useMemo(() => {
    return qcms.filter((q) => {
      if (classe !== "toutes" && q.classe !== classe) return false;
      if (chapitre !== "toutes" && q.chapitreNom !== chapitre) return false;
      return true;
    });
  }, [qcms, classe, chapitre]);

  // Organisation principale : par matière (déjà scindé par le parent), puis
  // par difficulté (sections). Un QCM peut apparaître dans plusieurs
  // sections s'il a des difficultés différentes selon la série.
  const groupesParDifficulte = useMemo(() => {
    const groupes = new Map<Difficulte, QcmBanque[]>();
    for (const d of DIFFICULTES) groupes.set(d, []);
    for (const q of qcmsFiltres) {
      for (const d of new Set(q.difficultes.map((x) => x.difficulte))) {
        groupes.get(d)?.push(q);
      }
    }
    return groupes;
  }, [qcmsFiltres]);

  function toggleSelection(id: string, checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleGroupe(ids: string[], checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4" /> Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Classe</span>
            <Select
              items={{ toutes: "Toutes", ...Object.fromEntries(CLASSES.map((c) => [c, c])) }}
              value={classe}
              onValueChange={(v) => {
                if (!v) return;
                setClasse(v as Classe | "toutes");
                setChapitre("toutes");
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Chapitre</span>
            <Select
              items={{ toutes: "Tous", ...Object.fromEntries(chapitresDisponibles.map((c) => [c, c])) }}
              value={chapitre}
              onValueChange={(v) => v && setChapitre(v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Tous</SelectItem>
                {chapitresDisponibles.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {qcmsFiltres.length} QCM{qcmsFiltres.length !== 1 ? "s" : ""}
          {selectionActive ? ` — ${selection.size} sélectionné${selection.size !== 1 ? "s" : ""}` : ""}
        </p>
        {selectionActive && renderToolbar && (
          <div className="flex flex-wrap gap-2">
            {renderToolbar({ selection: Array.from(selection), qcms, clearSelection: () => setSelection(new Set()) })}
          </div>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : qcmsFiltres.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun QCM pour ces filtres" hint="Essaie d'élargir la classe ou le chapitre." />
      ) : (
        <div className="space-y-4">
          {DIFFICULTES.map((d) => {
            const items = groupesParDifficulte.get(d) ?? [];
            if (items.length === 0) return null;
            const ids = items.map((q) => q.id);
            const toutSelectionne = ids.every((id) => selection.has(id));
            return (
              <Card key={d}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="secondary">{DIFFICULTE_LABEL[d]}</Badge>
                    <span className="text-sm font-normal text-muted-foreground">
                      {items.length} QCM{items.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectionActive && (
                          <TableHead className="w-10">
                            <Checkbox checked={toutSelectionne} onCheckedChange={(checked) => toggleGroupe(ids, checked === true)} />
                          </TableHead>
                        )}
                        <TableHead>Titre</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Chapitre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Détail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((q) => (
                        <TableRow key={q.id}>
                          {selectionActive && (
                            <TableCell>
                              <Checkbox checked={selection.has(q.id)} onCheckedChange={(checked) => toggleSelection(q.id, checked === true)} />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{q.titre}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{q.classe}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{q.chapitreNom}</TableCell>
                          <TableCell>
                            <Badge variant={q.statut === "publie" ? "default" : "outline"}>{q.statut === "publie" ? "Publié" : "Brouillon"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon-sm" onClick={() => setQcmOuvert(q)}>
                              <Eye />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={qcmOuvert !== null} onOpenChange={(open) => !open && setQcmOuvert(null)}>
        <SheetContent className="overflow-y-auto">
          {qcmOuvert && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{qcmOuvert.classe}</Badge>
                  <Badge variant={qcmOuvert.statut === "publie" ? "default" : "outline"}>
                    {qcmOuvert.statut === "publie" ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
                <SheetTitle>{qcmOuvert.titre}</SheetTitle>
                <SheetDescription>
                  {qcmOuvert.chapitreNom} · {qcmOuvert.notionNom}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <p className="text-sm">{qcmOuvert.enonce}</p>
                <div className="space-y-2">
                  {qcmOuvert.choix.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                        c.estCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"
                      }`}
                    >
                      {c.estCorrect ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0" />
                      )}
                      <span>{c.texte}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
