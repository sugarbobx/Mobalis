"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { CompteLectureSeule } from "@/components/shared/compte-lecture-seule";
import type { QuestionQCM, TypeExercice } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

type Devoirs = ReturnType<ReturnType<typeof useStore>["getDevoirsByEleve"]>;

export function ExerciseRunner({ assignationId }: { assignationId: string }) {
  const { getDevoirsByEleve, addSoumission, updateAssignation, getEleve } = useStore();
  const CURRENT_STUDENT_ID = useCurrentUser().id;
  const devoir = getDevoirsByEleve(CURRENT_STUDENT_ID).find((d) => d.assignation.id === assignationId);
  const lectureSeule = getEleve(CURRENT_STUDENT_ID)?.statutCompte === "diplome";

  const [reponses, setReponses] = useState<Record<number, string>>({});
  const [reponseLibre, setReponseLibre] = useState("");
  const [soumis, setSoumis] = useState(false);
  const [scoreSimule, setScoreSimule] = useState<number | null>(null);

  if (!devoir) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Exercice introuvable.</p>
        <Link href="/student/exercises" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft /> Retour aux exercices
        </Link>
      </div>
    );
  }

  const { assignation, exercice, matiere, soumission } = devoir;
  const dejaTraite = assignation.statut !== "a_faire" || lectureSeule;

  function valider() {
    const date = "2026-07-06";
    if (exercice.type === "qcm") {
      const questions = exercice.questions ?? [];
      const bonnesReponses = questions.filter((q, qi) => Number(reponses[qi]) === q.bonneReponseIndex).length;
      const score = questions.length > 0 ? Math.round((bonnesReponses / questions.length) * 100) : 0;
      setScoreSimule(score);
      addSoumission({
        assignationId: assignation.id,
        eleveId: CURRENT_STUDENT_ID,
        reponseQcm: Object.values(reponses).map(Number),
        date,
        statut: "auto_corrige",
        scoreAuto: score,
        scoreFinal: score,
      });
      updateAssignation(assignation.id, { statut: "corrige", score });
    } else {
      addSoumission({
        assignationId: assignation.id,
        eleveId: CURRENT_STUDENT_ID,
        reponseLibre,
        date,
        statut: "en_attente_correction",
      });
      updateAssignation(assignation.id, { statut: "fait" });
    }
    setSoumis(true);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/student/exercises" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeft /> Retour aux exercices
      </Link>

      {lectureSeule && <CompteLectureSeule />}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{matiere.nom}</Badge>
            <Badge>{exercice.type === "qcm" ? "QCM" : exercice.type === "diagnostic" ? "Diagnostic" : "Réponse libre"}</Badge>
          </div>
          <CardTitle>{exercice.titre}</CardTitle>
          <CardDescription>{exercice.consigne}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {soumis ? (
            <div className="space-y-4">
              <ResultatSoumission
                type={exercice.type}
                score={scoreSimule}
              />
              {exercice.type === "qcm" && exercice.questions && (
                <DetailQcm
                  questions={exercice.questions}
                  reponsesChoisies={exercice.questions.map((_, qi) => Number(reponses[qi]))}
                />
              )}
            </div>
          ) : dejaTraite ? (
            <ResultatExistant devoir={devoir} />
          ) : exercice.type === "qcm" ? (
            <div className="space-y-5">
              {exercice.questions?.map((q, qi) => (
                <div key={qi} className="space-y-2">
                  <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                  <RadioGroup
                    value={reponses[qi] ?? ""}
                    onValueChange={(v) => setReponses((prev) => ({ ...prev, [qi]: v as string }))}
                  >
                    {q.choix.map((choix, ci) => (
                      <label key={ci} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                        <RadioGroupItem value={String(ci)} />
                        {choix}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <Button onClick={valider} disabled={Object.keys(reponses).length < (exercice.questions?.length ?? 0)}>
                Valider mes réponses
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">{exercice.enonce}</p>
              <div className="space-y-1.5">
                <Label htmlFor="reponse">Ta réponse</Label>
                <Textarea id="reponse" rows={6} value={reponseLibre} onChange={(e) => setReponseLibre(e.target.value)} placeholder="Rédige ta réponse ici..." />
              </div>
              <Button onClick={valider} disabled={reponseLibre.trim().length === 0}>
                Envoyer ma réponse
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!dejaTraite && (
        <p className="text-xs text-muted-foreground">
          {exercice.type === "qcm"
            ? "Ta réponse est corrigée automatiquement et enregistrée."
            : exercice.type === "diagnostic"
              ? "Exercice de positionnement — pas de note formelle, sert juste à ton répétiteur pour situer ton niveau de départ."
              : "Ta réponse est enregistrée et sera visible par ton répétiteur pour correction."}
        </p>
      )}
    </div>
  );
}

function ResultatSoumission({ type, score }: { type: TypeExercice; score: number | null }) {
  if (type === "qcm") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 className="size-5 text-emerald-400" />
        <div>
          <p className="text-sm font-medium">Exercice corrigé automatiquement</p>
          <p className="text-lg font-semibold text-primary">{score}/100</p>
        </div>
      </div>
    );
  }
  if (type === "diagnostic") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <CheckCircle2 className="size-5 text-primary" />
        <p className="text-sm">Réponse envoyée à ton répétiteur — ce n&apos;est pas noté, juste un point de départ.</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <CheckCircle2 className="size-5 text-amber-400" />
      <p className="text-sm">Ta réponse a bien été envoyée — en attente de correction par ton répétiteur.</p>
    </div>
  );
}

function DetailQcm({ questions, reponsesChoisies }: { questions: QuestionQCM[]; reponsesChoisies: number[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Détail des réponses</p>
      {questions.map((q, qi) => {
        const choisi = reponsesChoisies[qi];
        const correct = choisi === q.bonneReponseIndex;
        return (
          <div
            key={qi}
            className={`space-y-1 rounded-lg border px-3 py-2 text-sm ${
              correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <p className="font-medium">{qi + 1}. {q.question}</p>
            <p className={`flex items-center gap-1.5 ${correct ? "text-emerald-400" : "text-red-400"}`}>
              {correct ? <CheckCircle2 className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
              Ta réponse : {q.choix[choisi] ?? "—"}
            </p>
            {!correct && (
              <p className="text-muted-foreground">Bonne réponse : {q.choix[q.bonneReponseIndex]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultatExistant({ devoir }: { devoir: Devoirs[number] }) {
  const { assignation, soumission, exercice } = devoir;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={assignation.statut} />
        {typeof assignation.score === "number" && (
          <span className="text-lg font-semibold text-primary">{assignation.score}/100</span>
        )}
      </div>
      {exercice.type === "qcm" && exercice.questions && soumission?.reponseQcm && (
        <DetailQcm questions={exercice.questions} reponsesChoisies={soumission.reponseQcm} />
      )}
      {soumission?.reponseLibre && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Ta réponse</p>
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{soumission.reponseLibre}</p>
        </div>
      )}
      {soumission?.commentaireCorrection && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Commentaire du répétiteur</p>
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{soumission.commentaireCorrection}</p>
        </div>
      )}
      {exercice.type === "qcm" && !soumission && (
        <p className="text-sm text-muted-foreground">Exercice déjà corrigé automatiquement.</p>
      )}
    </div>
  );
}
