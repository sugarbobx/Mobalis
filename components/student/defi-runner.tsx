"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  demarrerDefi,
  soumettreDefi,
  type QuestionDefi,
  type ResultatDefi,
} from "@/lib/defis";

function formatTemps(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DefiRunner({ defiId }: { defiId: string }) {
  const [questions, setQuestions] = useState<QuestionDefi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const [resultat, setResultat] = useState<ResultatDefi | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [secondes, setSecondes] = useState(0);
  // Chrono local purement indicatif — le serveur mesure le vrai temps depuis
  // demarrer_defi (started_at), y compris en cas de reprise après fermeture.
  const departRef = useRef<number | null>(null);

  useEffect(() => {
    demarrerDefi(defiId)
      .then((q) => {
        setQuestions(q);
        departRef.current = Date.now();
      })
      .catch((err) => setErreur(err instanceof Error ? err.message : "Défi indisponible."))
      .finally(() => setChargement(false));
  }, [defiId]);

  useEffect(() => {
    if (!questions || resultat) return;
    const interval = setInterval(() => {
      if (departRef.current) setSecondes(Math.floor((Date.now() - departRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [questions, resultat]);

  async function valider() {
    if (!questions) return;
    setEnvoi(true);
    try {
      const res = await soumettreDefi(defiId, questions.map((_, qi) => reponses[qi]));
      setResultat(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la soumission");
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return <p className="text-sm text-muted-foreground">Préparation de ton tirage…</p>;
  }

  if (erreur || !questions) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{erreur ?? "Ce défi n'est pas disponible."}</p>
        <Link href="/student/challenges" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft /> Retour aux défis
        </Link>
      </div>
    );
  }

  // Regroupement visuel par matière (utile pour le défi mensuel multi-matières)
  const multiMatiere = new Set(questions.map((q) => q.matiere)).size > 1;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/student/challenges" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
          <ArrowLeft /> Retour aux défis
        </Link>
        {!resultat && (
          <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium tabular-nums">
            <Timer className="size-4 text-primary" /> {formatTemps(secondes)}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Défi en cours</CardTitle>
          <CardDescription>
            Tirage personnel — tes questions sont différentes de celles des autres. Le temps compte : bonus de rapidité jusqu&apos;à 20 % des points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {resultat ? (
            <ResultatEcran resultat={resultat} questions={questions} reponses={reponses} />
          ) : (
            <>
              {questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                    {multiMatiere && <Badge variant="outline" className="shrink-0 text-[10px]">{q.matiere}</Badge>}
                  </div>
                  <RadioGroup
                    value={reponses[qi] !== undefined ? String(reponses[qi]) : ""}
                    onValueChange={(v) => v && setReponses((prev) => ({ ...prev, [qi]: Number(v) }))}
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
              <Button onClick={valider} disabled={envoi || Object.keys(reponses).length < questions.length}>
                {envoi ? "Envoi..." : "Valider mes réponses"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultatEcran({
  resultat,
  questions,
  reponses,
}: {
  resultat: ResultatDefi;
  questions: QuestionDefi[];
  reponses: Record<number, number>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <Trophy className="size-5 text-primary" />
        <div>
          <p className="text-sm font-medium">
            Score : {resultat.score}/100 · en {formatTemps(resultat.tempsSecondes)}
          </p>
          <p className="text-lg font-semibold text-primary">
            +{resultat.points} points
            {resultat.bonus > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(dont +{resultat.bonus} rapidité)</span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Détail des réponses</p>
        {questions.map((q, qi) => {
          const choisi = reponses[qi];
          const bonne = resultat.corrections[qi];
          const correct = choisi === bonne;
          return (
            <div
              key={q.id}
              className={`space-y-1 rounded-lg border px-3 py-2 text-sm ${
                correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="font-medium">{qi + 1}. {q.question}</p>
              <p className={`flex items-center gap-1.5 ${correct ? "text-emerald-400" : "text-red-400"}`}>
                {correct ? <CheckCircle2 className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
                Ta réponse : {q.choix[choisi] ?? "—"}
              </p>
              {!correct && <p className="text-muted-foreground">Bonne réponse : {q.choix[bonne]}</p>}
            </div>
          );
        })}
      </div>

      <Link href="/student/challenges" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Voir le classement
      </Link>
    </div>
  );
}
