"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Rocket, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import {
  getBanqueQcm,
  getDefisEligibles,
  pousserQcmVersDefi,
  publierQcm,
  type QcmBanque,
  type DefiEligible,
  type Difficulte,
} from "@/lib/qcm-bank";
import type { Classe } from "@/lib/mock";

const CLASSES: Classe[] = ["2nde", "1ère", "Tle"];
const DIFFICULTES: Difficulte[] = ["facile", "moyen", "difficile", "genius"];
const DIFFICULTE_LABEL: Record<Difficulte, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
  genius: "Genius",
};

export default function AdminQcmBankPage() {
  const { getMatieresActives } = useStore();
  const matieres = getMatieresActives();

  const [matiereId, setMatiereId] = useState<string>("");
  const [classe, setClasse] = useState<Classe | "toutes">("toutes");
  const [chapitre, setChapitre] = useState<string>("toutes");

  const [qcms, setQcms] = useState<QcmBanque[]>([]);
  const [chargement, setChargement] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (matieres.length > 0 && !matiereId) setMatiereId(matieres[0].id);
  }, [matieres, matiereId]);

  useEffect(() => {
    if (!matiereId) return;
    setChargement(true);
    setSelection(new Set());
    setClasse("toutes");
    setChapitre("toutes");
    getBanqueQcm(matiereId).then((data) => {
      setQcms(data);
      setChargement(false);
    });
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

  // Organisation principale demandée : par matière (onglets ci-dessus), puis
  // par difficulté (sections ci-dessous). Un QCM peut apparaître dans
  // plusieurs sections s'il a des difficultés différentes selon la série.
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
      for (const id of ids) (checked ? next.add(id) : next.delete(id));
      return next;
    });
  }

  const selectionArr = Array.from(selection);
  const selectionBrouillon = selectionArr.filter((id) => qcms.find((q) => q.id === id)?.statut === "brouillon");
  const selectionPubliee = selectionArr.filter((id) => qcms.find((q) => q.id === id)?.statut === "publie");

  const classesSelectionPubliee = useMemo(() => {
    const set = new Set(qcms.filter((q) => selectionPubliee.includes(q.id)).map((q) => q.classe));
    return Array.from(set);
  }, [qcms, selectionPubliee]);
  const selectionHomogene = classesSelectionPubliee.length <= 1;

  async function publier() {
    if (selectionBrouillon.length === 0) return;
    try {
      await publierQcm(selectionBrouillon);
      setQcms((prev) => prev.map((q) => (selectionBrouillon.includes(q.id) ? { ...q, statut: "publie" } : q)));
      toast.success(`${selectionBrouillon.length} QCM publié${selectionBrouillon.length !== 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la publication.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Banque QCM</h1>
        <p className="text-sm text-muted-foreground">
          Organisée par matière puis par difficulté. Publie un QCM brouillon pour le rendre poussable vers un défi.
        </p>
      </div>

      {matieres.length > 0 && (
        <Tabs value={matiereId} onValueChange={setMatiereId}>
          <TabsList className="flex-wrap">
            {matieres.map((m) => (
              <TabsTrigger key={m.id} value={m.id}>
                {m.nom}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

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
                setChapitre("toutes"); // le chapitre sélectionné peut ne pas exister pour la nouvelle classe
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
          {qcmsFiltres.length} QCM{qcmsFiltres.length !== 1 ? "s" : ""} — {selection.size} sélectionné{selection.size !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={selectionBrouillon.length === 0} onClick={publier}>
            <CheckCircle2 />
            Publier ({selectionBrouillon.length})
          </Button>
          <PousserDialog
            selection={selectionPubliee}
            selectionHomogene={selectionHomogene}
            classeSelection={classesSelectionPubliee[0]}
            matiereId={matiereId}
            onPush={() => setSelection(new Set())}
          />
        </div>
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
                        <TableHead className="w-10">
                          <Checkbox checked={toutSelectionne} onCheckedChange={(checked) => toggleGroupe(ids, checked === true)} />
                        </TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Chapitre</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <Checkbox checked={selection.has(q.id)} onCheckedChange={(checked) => toggleSelection(q.id, checked === true)} />
                          </TableCell>
                          <TableCell className="font-medium">{q.titre}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{q.classe}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{q.chapitreNom}</TableCell>
                          <TableCell>
                            <Badge variant={q.statut === "publie" ? "default" : "outline"}>{q.statut === "publie" ? "Publié" : "Brouillon"}</Badge>
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
    </div>
  );
}

function PousserDialog({
  selection,
  selectionHomogene,
  classeSelection,
  matiereId,
  onPush,
}: {
  selection: string[];
  selectionHomogene: boolean;
  classeSelection: Classe | undefined;
  matiereId: string;
  onPush: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [defis, setDefis] = useState<DefiEligible[]>([]);
  const [chargement, setChargement] = useState(false);
  const [defiId, setDefiId] = useState<string>("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!open || !classeSelection) return;
    setChargement(true);
    setDefiId("");
    getDefisEligibles(classeSelection, matiereId).then((data) => {
      setDefis(data);
      setChargement(false);
    });
  }, [open, classeSelection, matiereId]);

  async function confirmer() {
    if (!defiId) return;
    setEnvoi(true);
    try {
      await pousserQcmVersDefi(defiId, selection);
      toast.success(`${selection.length} QCM poussé${selection.length !== 1 ? "s" : ""} vers le défi.`);
      setOpen(false);
      onPush();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du push.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={selection.length === 0} />}>
        <Rocket />
        Pousser vers un défi ({selection.length})
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pousser {selection.length} QCM vers un défi</DialogTitle>
          <DialogDescription>
            Les QCM publiés sélectionnés alimentent le tirage aléatoire de ce défi pour les élèves — les brouillons
            sélectionnés sont ignorés ici, publie-les d&apos;abord.
          </DialogDescription>
        </DialogHeader>

        {!selectionHomogene ? (
          <EmptyState
            icon={Layers}
            title="Sélection mixte"
            hint="Les QCM sélectionnés couvrent plusieurs classes — les défis sont mono-classe. Filtre par classe avant de pousser."
          />
        ) : chargement ? (
          <p className="text-sm text-muted-foreground">Chargement des défis…</p>
        ) : defis.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              icon={Rocket}
              title="Aucun défi disponible"
              hint={`Aucun défi ${classeSelection ?? ""} n'existe pour cette matière — crée-le d'abord.`}
            />
            <Link href="/admin/challenges" className={buttonVariants({ variant: "outline", size: "sm", className: "mx-auto" })}>
              Créer un défi
            </Link>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {defis.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                  defiId === d.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="defi-cible" className="accent-primary" checked={defiId === d.id} onChange={() => setDefiId(d.id)} />
                  <span>
                    <span className="font-medium">{d.titre}</span>{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {d.type === "hebdo" ? "Hebdo" : "Mensuel"}
                    </Badge>
                  </span>
                </span>
                <span className={`text-xs ${d.nbQcmPousses < d.nbQuestions ? "text-amber-500" : "text-muted-foreground"}`}>
                  {d.nbQcmPousses} / {d.nbQuestions} requis
                  {d.nbQcmPousses < d.nbQuestions && " — insuffisant, le tirage curé ne s'activera pas"}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={confirmer} disabled={!defiId || envoi}>
            {envoi ? "Envoi…" : "Confirmer le push"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
