"use client";

import { useEffect, useState } from "react";
import { Award, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MiniLineChart } from "@/components/shared/mini-line-chart";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { BulletinDownloadButton } from "@/components/shared/bulletin-download-button";
import { getSequences, type Sequence } from "@/lib/bulletin-sequentiel";

export default function StudentGradesPage() {
  const { getEvaluationsByMatiere, getMatiere, getObjectifsByEleve, getBadgesByEleve, getEleve, getBulletinsByEleve, getRepetiteur } = useStore();
  const CURRENT_STUDENT_ID = useCurrentUser().id;
  const eleve = getEleve(CURRENT_STUDENT_ID);
  const objectifs = getObjectifsByEleve(CURRENT_STUDENT_ID);
  const badges = getBadgesByEleve(CURRENT_STUDENT_ID);
  const bulletins = getBulletinsByEleve(CURRENT_STUDENT_ID);
  const remarques = (eleve?.matiereIds ?? [])
    .flatMap((id) => getEvaluationsByMatiere(CURRENT_STUDENT_ID, id))
    .filter((e) => e.visibleEleve && e.remarque)
    .sort((a, b) => b.date.localeCompare(a.date));
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  useEffect(() => {
    void getSequences().then((s) => {
      setSequences(s);
      if (s.length > 0) setSequenceId(s[s.length - 1].id);
    });
  }, []);
  if (!eleve) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notes & objectifs</h1>
        <p className="text-sm text-muted-foreground">Ton évolution matière par matière.</p>
      </div>

      {bulletins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="size-4" /> Bulletins annuels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bulletins.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">Année {b.anneeScolaire}</p>
                  <p className="text-muted-foreground">{b.appreciationGenerale}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-primary">{b.moyenneGenerale}/20</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sequences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="size-4" /> Bulletin par séquence</CardTitle>
            <CardDescription>Bulletin détaillé (classement, coefficients) d&apos;une séquence donnée.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Select
              items={Object.fromEntries(sequences.map((s) => [s.id, s.libelle]))}
              value={sequenceId ?? undefined}
              onValueChange={(v) => v && setSequenceId(v)}
            >
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.libelle}</SelectItem>)}
              </SelectContent>
            </Select>
            {sequenceId && <BulletinDownloadButton eleveId={CURRENT_STUDENT_ID} sequenceId={sequenceId} />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Évolution des notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {eleve.matiereIds.map((matiereId) => {
            const evals = getEvaluationsByMatiere(CURRENT_STUDENT_ID, matiereId).filter((e) => e.note !== null);
            return (
              <div key={matiereId} className="space-y-2">
                <span className="text-sm font-medium">{getMatiere(matiereId)?.nom}</span>
                <MiniLineChart data={evals.map((e) => ({ label: e.date, value: e.note as number }))} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remarques de tes répétiteurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {remarques.map((r) => (
            <div key={r.id} className="rounded-lg border border-border px-4 py-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{getMatiere(r.matiereId)?.nom} · {getRepetiteur(r.repetiteurId)?.prenom} {getRepetiteur(r.repetiteurId)?.nom}</span>
                <span>{r.date}</span>
              </div>
              <p className="mt-1">{r.remarque}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objectifs personnels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectifs.map((o) => (
              <div key={o.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{o.titre}</span>
                  <span className="text-muted-foreground">{o.progression}%</span>
                </div>
                <Progress value={o.progression} />
                <p className="text-xs text-muted-foreground">
                  {getMatiere(o.matiereId)?.nom} · échéance {o.dateEcheance}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges & récompenses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b.id} className="card-interactive flex w-40 flex-col items-center gap-2 rounded-lg border border-border px-3 py-4 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="size-5" />
                </span>
                <span className="text-sm font-medium">{b.nom}</span>
                <span className="text-xs text-muted-foreground">{b.description}</span>
                <Badge variant="outline" className="text-[10px]">{b.dateObtention}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
