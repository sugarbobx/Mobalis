"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { getBanqueQcm, getDefisEligibles, pousserQcmVersDefi, type QcmBanque, type DefiEligible, type Difficulte } from "@/lib/qcm-bank";
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
  const [difficulte, setDifficulte] = useState<Difficulte | "toutes">("toutes");

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
    setDifficulte("toutes");
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
      if (difficulte !== "toutes" && !q.difficultes.some((d) => d.difficulte === difficulte)) return false;
      return true;
    });
  }, [qcms, classe, chapitre, difficulte]);

  function toggleSelection(id: string, checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleTout(checked: boolean) {
    // Un QCM brouillon ne peut pas être poussé (RLS) — on ne le propose pas à la sélection groupée.
    setSelection(checked ? new Set(qcmsFiltres.filter((q) => q.statut === "publie").map((q) => q.id)) : new Set());
  }

  const classesSelection = useMemo(() => {
    const set = new Set(qcms.filter((q) => selection.has(q.id)).map((q) => q.classe));
    return Array.from(set);
  }, [qcms, selection]);
  const selectionHomogene = classesSelection.length <= 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Banque QCM</h1>
        <p className="text-sm text-muted-foreground">
          Parcours l&apos;intégralité de la banque et pousse un groupe de QCM vers un défi existant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4" /> Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Matière</span>
            <Select items={Object.fromEntries(matieres.map((m) => [m.id, m.nom]))} value={matiereId} onValueChange={(v) => v && setMatiereId(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Difficulté</span>
            <Select
              items={{ toutes: "Toutes", ...Object.fromEntries(DIFFICULTES.map((d) => [d, DIFFICULTE_LABEL[d]])) }}
              value={difficulte}
              onValueChange={(v) => v && setDifficulte(v as Difficulte | "toutes")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes</SelectItem>
                {DIFFICULTES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIFFICULTE_LABEL[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {qcmsFiltres.length} QCM{qcmsFiltres.length !== 1 ? "s" : ""} — {selection.size} sélectionné{selection.size !== 1 ? "s" : ""}
        </p>
        <PousserDialog
          selection={Array.from(selection)}
          selectionHomogene={selectionHomogene}
          classeSelection={classesSelection[0]}
          matiereId={matiereId}
          onPush={() => setSelection(new Set())}
        />
      </div>

      {chargement ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : qcmsFiltres.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun QCM pour ces filtres" hint="Essaie d'élargir la classe ou la difficulté." />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        qcmsFiltres.some((q) => q.statut === "publie") &&
                        qcmsFiltres.filter((q) => q.statut === "publie").every((q) => selection.has(q.id))
                      }
                      onCheckedChange={(checked) => toggleTout(checked === true)}
                    />
                  </TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Chapitre</TableHead>
                  <TableHead>Difficultés</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcmsFiltres.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(q.id)}
                        disabled={q.statut !== "publie"}
                        onCheckedChange={(checked) => toggleSelection(q.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{q.titre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.classe}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.chapitreNom}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(q.difficultes.map((d) => d.difficulte))).map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px]">
                            {DIFFICULTE_LABEL[d]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.statut === "publie" ? "default" : "outline"}>{q.statut === "publie" ? "Publié" : "Brouillon"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
          <DialogDescription>Les QCM sélectionnés alimentent le tirage aléatoire de ce défi pour les élèves.</DialogDescription>
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
