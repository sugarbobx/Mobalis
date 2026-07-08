"use client";

import { useState } from "react";
import { Smile, Frown } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompteLectureSeule } from "@/components/shared/compte-lecture-seule";
import { CURRENT_STUDENT_ID } from "@/lib/mock";
import { useStore } from "@/lib/store";

const STYLES = ["Visuel", "Auditif", "Kinesthésique"];
const STYLE_ITEMS = Object.fromEntries(STYLES.map((s) => [s, s]));

export default function StudentProfilePage() {
  const { getMatieresActives, getMatiere, getSeancesByEleve, autoEvaluations, addAutoEvaluation, getEleve } = useStore();
  const eleve = getEleve(CURRENT_STUDENT_ID)!;
  const lectureSeule = eleve.statutCompte === "diplome";
  const matieresActives = getMatieresActives(eleve.serie);

  const [matieresSuivies, setMatieresSuivies] = useState<string[]>(eleve.matiereIds);
  const [style, setStyle] = useState(eleve.styleApprentissage);

  const autoEvals = autoEvaluations.filter((a) => a.eleveId === CURRENT_STUDENT_ID);
  const seances = getSeancesByEleve(CURRENT_STUDENT_ID);
  const [seanceId, setSeanceId] = useState(seances[0]?.id ?? "");
  const [chapitre, setChapitre] = useState("");

  function toggleMatiere(id: string) {
    setMatieresSuivies((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function ajouterAutoEval(moment: "avant" | "apres", ressenti: "a_l_aise" | "pas_a_l_aise") {
    if (lectureSeule) return;
    if (!chapitre.trim() || !seanceId) {
      toast.error("Indique le chapitre concerné avant d'enregistrer ton ressenti.");
      return;
    }
    addAutoEvaluation({
      id: `ae-${Date.now()}`,
      eleveId: CURRENT_STUDENT_ID,
      seanceId,
      moment,
      chapitre: chapitre.trim(),
      ressenti,
      date: "2026-07-05",
    });
    setChapitre("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Tes préférences et ton ressenti avant/après séance.</p>
      </div>

      {lectureSeule && <CompteLectureSeule />}

      <Card>
        <CardHeader>
          <CardTitle>{eleve.prenom} {eleve.nom}</CardTitle>
          <CardDescription>Informations et préférences d&apos;apprentissage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Classe / Série</Label>
              <div className="flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 text-sm">
                {eleve.classe} · Série {eleve.serie}
              </div>
              <p className="text-xs text-muted-foreground">
                Modifiable uniquement par l&apos;administration, en fin d&apos;année scolaire.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Style d&apos;apprentissage</Label>
              <Select items={STYLE_ITEMS} value={style} onValueChange={(v) => v && setStyle(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Matières suivies</Label>
            <div className="flex flex-wrap gap-3">
              {matieresActives.map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Checkbox checked={matieresSuivies.includes(m.id)} onCheckedChange={() => toggleMatiere(m.id)} />
                  {m.nom}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matieresSuivies.map((id) => <Badge key={id} variant="secondary">{getMatiere(id)?.nom}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-évaluation</CardTitle>
          <CardDescription>Avant ou après une séance, indique ton ressenti sur un chapitre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label>Séance</Label>
              <Select
                items={Object.fromEntries(seances.map((s) => [s.id, `${s.date} · ${getMatiere(s.matiereId)?.nom}`]))}
                value={seanceId}
                onValueChange={(v) => v && setSeanceId(v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {seances.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.date} · {getMatiere(s.matiereId)?.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="chapitre">Chapitre</Label>
              <input
                id="chapitre"
                value={chapitre}
                onChange={(e) => setChapitre(e.target.value)}
                placeholder="Ex. Les fractions"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <Button variant="outline" className="self-end" disabled={lectureSeule} onClick={() => ajouterAutoEval("avant", "a_l_aise")}>
              <Smile className="text-emerald-400" /> À l&apos;aise
            </Button>
            <Button variant="outline" className="self-end" disabled={lectureSeule} onClick={() => ajouterAutoEval("avant", "pas_a_l_aise")}>
              <Frown className="text-amber-400" /> Pas à l&apos;aise
            </Button>
          </div>

          <div className="space-y-2">
            {autoEvals.map((ae) => (
              <div key={ae.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
                <span>
                  {ae.moment === "avant" ? "Avant" : "Après"} séance — {ae.chapitre}
                </span>
                <Badge variant="outline" className={ae.ressenti === "a_l_aise" ? "text-emerald-400" : "text-amber-400"}>
                  {ae.ressenti === "a_l_aise" ? "À l'aise" : "Pas à l'aise"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
