"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, XCircle, RotateCcw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { useOnlineStatus } from "@/lib/use-online-status";
import {
  getChapitres,
  demarrerRevision,
  soumettreRevision,
  getMaitrise,
  type QuestionRevision,
  type ResultatRevision,
  type ChapitreDisponible,
  type MaitriseChapitre,
} from "@/lib/revision";

const TOUS_CHAPITRES = "__tous__";

export default function StudentRevisionPage() {
  const online = useOnlineStatus();
  const { getEleve, getMatiere } = useStore();
  const eleveId = useCurrentUser().id;
  const eleve = getEleve(eleveId);

  const [maitrise, setMaitrise] = useState<MaitriseChapitre[]>([]);
  const [matiereId, setMatiereId] = useState("");
  const [chapitres, setChapitres] = useState<ChapitreDisponible[]>([]);
  const [chapitre, setChapitre] = useState(TOUS_CHAPITRES);

  // Session en cours
  const [questions, setQuestions] = useState<QuestionRevision[] | null>(null);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const [resultat, setResultat] = useState<ResultatRevision | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!online) return;
    getMaitrise().then(setMaitrise);
  }, [online]);

  useEffect(() => {
    if (eleve && !matiereId && eleve.matiereIds.length > 0) setMatiereId(eleve.matiereIds[0]);
  }, [eleve, matiereId]);

  useEffect(() => {
    if (!matiereId || !online) return;
    setChapitre(TOUS_CHAPITRES);
    getChapitres(matiereId).then(setChapitres);
  }, [matiereId, online]);

  if (!eleve) return null;

  if (!online) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Connexion requise"
        hint="La révision tire ses questions et corrige tes réponses sur le serveur — reviens une fois reconnecté. Tes barres de maîtrise restent inchangées en attendant."
      />
    );
  }

  async function lancerSession() {
    const q = await demarrerRevision(matiereId, chapitre === TOUS_CHAPITRES ? null : chapitre, 10);
    if (q.length === 0) {
      toast.info("Aucune question disponible pour cette sélection — la banque se remplit au fil de l'année.");
      return;
    }
    setQuestions(q);
    setReponses({});
    setResultat(null);
  }

  async function validerSession() {
    if (!questions) return;
    setEnvoi(true);
    try {
      const res = await soumettreRevision(
        questions.map((q) => q.id),
        questions.map((_, qi) => reponses[qi])
      );
      setResultat(res);
      getMaitrise().then(setMaitrise); // rafraîchit les barres
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la soumission");
    } finally {
      setEnvoi(false);
    }
  }

  function fermerSession() {
    setQuestions(null);
    setResultat(null);
    setReponses({});
  }

  const chapitreItems = {
    [TOUS_CHAPITRES]: "Tous les chapitres",
    ...Object.fromEntries(chapitres.map((c) => [c.chapitre, `${c.chapitre} (${c.nbQuestions})`])),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Révision</h1>
        <p className="text-sm text-muted-foreground">
          Entraîne-toi en illimité, matière par matière — sans chrono, sans points, juste ta progression.
        </p>
      </div>

      {questions ? (
        <Card>
          <CardHeader>
            <CardTitle>Session de révision — {getMatiere(matiereId)?.nom}</CardTitle>
            <CardDescription>
              {chapitre === TOUS_CHAPITRES ? "Tous les chapitres" : chapitre} · {questions.length} questions · réponds à ton rythme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {resultat ? (
              <SessionResultat questions={questions} reponses={reponses} resultat={resultat} onRefaire={lancerSession} onFermer={fermerSession} />
            ) : (
              <>
                {questions.map((q, qi) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{q.chapitre}</Badge>
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
                <div className="flex gap-2">
                  <Button onClick={validerSession} disabled={envoi || Object.keys(reponses).length < questions.length}>
                    {envoi ? "Correction..." : "Corriger"}
                  </Button>
                  <Button variant="ghost" onClick={fermerSession}>Abandonner</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpenCheck className="size-4" /> Se tester</CardTitle>
            <CardDescription>10 questions tirées au hasard dans la banque de ton centre, pour ta classe.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Matière</Label>
              <Select
                items={Object.fromEntries(eleve.matiereIds.map((id) => [id, getMatiere(id)?.nom ?? id]))}
                value={matiereId}
                onValueChange={(v) => v && setMatiereId(v)}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eleve.matiereIds.map((id) => (
                    <SelectItem key={id} value={id}>{getMatiere(id)?.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chapitre</Label>
              <Select items={chapitreItems} value={chapitre} onValueChange={(v) => v && setChapitre(v)}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(chapitreItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={lancerSession} disabled={!matiereId}>Lancer la session</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ma maîtrise</CardTitle>
          <CardDescription>
            Basée sur tes 20 dernières réponses par chapitre — révise un chapitre faible pour faire monter sa barre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {maitrise.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="Aucune donnée de maîtrise pour l'instant"
              hint="Lance ta première session de révision — chaque réponse alimente ta progression."
            />
          ) : (
            eleve.matiereIds.map((mid) => {
              const lignes = maitrise.filter((m) => m.matiereId === mid);
              if (lignes.length === 0) return null;
              const global = Math.round(lignes.reduce((acc, l) => acc + l.pct, 0) / lignes.length);
              return (
                <div key={mid} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{getMatiere(mid)?.nom}</span>
                    <span className="text-sm font-semibold text-primary">{global}%</span>
                  </div>
                  {lignes.map((l) => (
                    <div key={l.chapitre} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{l.chapitre}</span>
                        <span className="text-muted-foreground">{l.pct}% · {l.nbCorrectes}/{l.nbRepondues}</span>
                      </div>
                      <Progress value={l.pct} />
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionResultat({
  questions,
  reponses,
  resultat,
  onRefaire,
  onFermer,
}: {
  questions: QuestionRevision[];
  reponses: Record<number, number>;
  resultat: ResultatRevision;
  onRefaire: () => void;
  onFermer: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <BookOpenCheck className="size-5 text-primary" />
        <p className="text-lg font-semibold text-primary">{resultat.score}/100</p>
      </div>

      <div className="space-y-2">
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

      <div className="flex gap-2">
        <Button onClick={onRefaire}><RotateCcw /> Nouvelle session</Button>
        <Button variant="outline" onClick={onFermer}>Terminer</Button>
      </div>
    </div>
  );
}
