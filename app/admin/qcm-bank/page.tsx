"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Rocket, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { QcmBanqueExplorer } from "@/components/shared/qcm-banque-explorer";
import { useStore } from "@/lib/store";
import { getDefisEligibles, pousserQcmVersDefi, publierQcm, type QcmBanque, type DefiEligible } from "@/lib/qcm-bank";
import type { Classe } from "@/lib/mock";

export default function AdminQcmBankPage() {
  const { getMatieresActives, derniereSyncAt } = useStore();
  const matieres = getMatieresActives();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Banque QCM</h1>
        <p className="text-sm text-muted-foreground">
          Organisée par matière puis par difficulté. Publie un QCM brouillon pour le rendre poussable vers un défi.
        </p>
      </div>

      {derniereSyncAt === null ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <QcmBanqueExplorer
          matieres={matieres}
          selectionActive
          renderToolbar={({ selection, qcms, clearSelection }) => (
            <Toolbar selection={selection} qcms={qcms} clearSelection={clearSelection} />
          )}
        />
      )}
    </div>
  );
}

function Toolbar({
  selection,
  qcms,
  clearSelection,
}: {
  selection: string[];
  qcms: QcmBanque[];
  clearSelection: () => void;
}) {
  const selectionBrouillon = selection.filter((id) => qcms.find((q) => q.id === id)?.statut === "brouillon");
  const selectionPubliee = selection.filter((id) => qcms.find((q) => q.id === id)?.statut === "publie");

  const classesSelectionPubliee = useMemo(() => {
    const set = new Set(qcms.filter((q) => selectionPubliee.includes(q.id)).map((q) => q.classe));
    return Array.from(set);
  }, [qcms, selectionPubliee]);
  const selectionHomogene = classesSelectionPubliee.length <= 1;

  async function publier() {
    if (selectionBrouillon.length === 0) return;
    try {
      await publierQcm(selectionBrouillon);
      toast.success(`${selectionBrouillon.length} QCM publié${selectionBrouillon.length !== 1 ? "s" : ""}.`);
      clearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la publication.");
    }
  }

  return (
    <>
      <Button variant="outline" disabled={selectionBrouillon.length === 0} onClick={publier}>
        <CheckCircle2 />
        Publier ({selectionBrouillon.length})
      </Button>
      <PousserDialog
        selection={selectionPubliee}
        selectionHomogene={selectionHomogene}
        classeSelection={classesSelectionPubliee[0]}
        matiereId={qcms[0]?.matiereId ?? ""}
        onPush={clearSelection}
      />
    </>
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
  const [defisChargesPour, setDefisChargesPour] = useState<string | null>(null);
  const [defiId, setDefiId] = useState<string>("");
  const [envoi, setEnvoi] = useState(false);

  const requeteEnCours = open && classeSelection ? `${classeSelection}:${matiereId}` : null;
  const chargement = requeteEnCours !== null && defisChargesPour !== requeteEnCours;

  useEffect(() => {
    if (!requeteEnCours || !classeSelection) return;
    let annule = false;
    getDefisEligibles(classeSelection, matiereId).then((data) => {
      if (annule) return;
      setDefis(data);
      setDefisChargesPour(requeteEnCours);
      setDefiId("");
    });
    return () => {
      annule = true;
    };
  }, [requeteEnCours, classeSelection, matiereId]);

  async function confirmer() {
    if (!defiId) return;
    setEnvoi(true);
    try {
      await pousserQcmVersDefi(defiId, selection);
      toast.success(`${selection.length} QCM poussé${selection.length !== 1 ? "s" : ""} vers le défi.`);
      setOpen(false);
      setDefisChargesPour(null);
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
          <Button onClick={confirmer} disabled={!defiId || envoi || chargement}>
            {envoi ? "Envoi…" : "Confirmer le push"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
