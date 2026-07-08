"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { CURRENT_TUTOR_ID } from "@/lib/mock";
import type { Soumission } from "@/lib/mock";
import { useStore } from "@/lib/store";

export default function TutorCorrectionsPage() {
  const { soumissions, assignations, getAssignation, getExercice, getMatiere, updateSoumission, updateAssignation, getEleve } = useStore();
  const [ouverte, setOuverte] = useState<Soumission | null>(null);
  const [score, setScore] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const enAttente = soumissions.filter((s) => {
    if (s.statut !== "en_attente_correction") return false;
    const assignation = assignations.find((a) => a.id === s.assignationId);
    return assignation?.repetiteurAssignantId === CURRENT_TUTOR_ID;
  });

  const corrigeesRecemment = soumissions.filter((s) => {
    if (s.statut !== "corrige_manuellement") return false;
    const assignation = assignations.find((a) => a.id === s.assignationId);
    return assignation?.repetiteurAssignantId === CURRENT_TUTOR_ID;
  });

  function ouvrir(s: Soumission) {
    setOuverte(s);
    setScore("");
    setCommentaire("");
  }

  function valider() {
    if (!ouverte) return;
    const scoreFinal = Number(score);
    if (!score.trim() || Number.isNaN(scoreFinal) || scoreFinal < 0 || scoreFinal > 100) {
      toast.error("Indique un score entre 0 et 100 avant de valider.");
      return;
    }
    updateSoumission(ouverte.id, {
      statut: "corrige_manuellement",
      scoreFinal,
      commentaireCorrection: commentaire.trim(),
    });
    updateAssignation(ouverte.assignationId, { statut: "corrige", score: scoreFinal });
    const eleve = getEleve(ouverte.eleveId);
    toast.success(`Correction enregistrée — ${eleve?.prenom} recevra ${scoreFinal}/100`);
    setOuverte(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Corrections en attente</h1>
        <p className="text-sm text-muted-foreground">
          Exercices à réponse libre soumis par les élèves, en attente de correction manuelle.
        </p>
      </div>

      {enAttente.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CheckCircle2}
              title="Aucune correction en attente"
              hint="Les réponses libres soumises par tes élèves apparaîtront ici."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {enAttente.map((s) => {
            const assignation = getAssignation(s.assignationId)!;
            const exercice = getExercice(assignation.exerciceId)!;
            const eleve = getEleve(s.eleveId)!;
            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getMatiere(exercice.matiereId)?.nom}</Badge>
                    <Badge className="bg-amber-500/15 text-amber-400">En attente</Badge>
                  </div>
                  <CardTitle className="text-base">{exercice.titre}</CardTitle>
                  <CardDescription>{eleve.prenom} {eleve.nom} · soumis le {s.date}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{s.reponseLibre}</p>
                  <Dialog open={ouverte?.id === s.id} onOpenChange={(open) => !open && setOuverte(null)}>
                    <DialogTrigger render={<Button size="sm" />} onClick={() => ouvrir(s)}>
                      Corriger
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Corriger — {exercice.titre}</DialogTitle>
                        <DialogDescription>{eleve.prenom} {eleve.nom}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{s.reponseLibre}</p>
                        <div className="space-y-1.5">
                          <Label htmlFor="score">Score /100</Label>
                          <Input id="score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="commentaire">Commentaire de correction</Label>
                          <Textarea id="commentaire" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={valider}>
                          <CheckCircle2 />
                          Valider la correction
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {corrigeesRecemment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Corrigées récemment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {corrigeesRecemment.map((s) => {
              const assignation = getAssignation(s.assignationId)!;
              const exercice = getExercice(assignation.exerciceId)!;
              const eleve = getEleve(s.eleveId)!;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
                  <span>{eleve.prenom} {eleve.nom} — {exercice.titre}</span>
                  <span className="font-semibold text-primary">{s.scoreFinal}/100</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
