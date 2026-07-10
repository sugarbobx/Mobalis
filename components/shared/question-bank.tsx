"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createClient } from "@/utils/supabase/client";
import type { Classe, Matiere } from "@/lib/mock";

const CLASSES: Classe[] = ["2nde", "1ère", "Tle"];
const CLASSE_APP_TO_DB: Record<Classe, string> = { "2nde": "2nde", "1ère": "1ere", Tle: "tle" };
const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };
const TOUS = "__tous__";

interface QuestionRow {
  id: string;
  matiere_id: string;
  classe: string;
  chapitre: string;
  question: string;
  choix: string[];
  bonne_reponse_index: number;
}

/**
 * Banque de questions du centre — alimente les défis (tirages individuels)
 * et la révision. `matieresAutorisees` restreint la création (répétiteur =
 * ses matières ; admin = toutes).
 */
export function QuestionBank({ matieresAutorisees, createdBy }: { matieresAutorisees: Matiere[]; createdBy: string }) {
  const { getMatiere } = useStore();
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [filtreMatiere, setFiltreMatiere] = useState(TOUS);
  const [filtreClasse, setFiltreClasse] = useState(TOUS);

  // Formulaire
  const [matiereId, setMatiereId] = useState(matieresAutorisees[0]?.id ?? "");
  const [classe, setClasse] = useState<Classe>("2nde");
  const [chapitre, setChapitre] = useState("");
  const [question, setQuestion] = useState("");
  const [choix, setChoix] = useState(["", "", "", ""]);
  const [bonneReponse, setBonneReponse] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!matiereId && matieresAutorisees.length > 0) setMatiereId(matieresAutorisees[0].id);
  }, [matieresAutorisees, matiereId]);

  async function charger() {
    const supabase = createClient();
    const { data } = await supabase
      .from("questions")
      .select("id, matiere_id, classe, chapitre, question, choix, bonne_reponse_index")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as QuestionRow[]);
    setChargement(false);
  }

  useEffect(() => {
    void charger();
  }, []);

  const formValide =
    !!matiereId && chapitre.trim().length > 0 && question.trim().length > 0 && choix.every((c) => c.trim().length > 0);

  async function ajouter() {
    if (!formValide) return;
    setEnvoi(true);
    const supabase = createClient();
    const { error } = await supabase.from("questions").insert({
      matiere_id: matiereId,
      classe: CLASSE_APP_TO_DB[classe],
      chapitre: chapitre.trim(),
      question: question.trim(),
      choix: choix.map((c) => c.trim()),
      bonne_reponse_index: bonneReponse,
      created_by: createdBy,
    });
    setEnvoi(false);
    if (error) {
      toast.error(`Échec de l'ajout : ${error.message}`);
      return;
    }
    toast.success("Question ajoutée à la banque");
    setQuestion("");
    setChoix(["", "", "", ""]);
    setBonneReponse(0);
    void charger();
  }

  async function supprimer(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast.error(`Suppression impossible : ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const chapitresExistants = Array.from(
    new Set(rows.filter((r) => r.matiere_id === matiereId && r.classe === CLASSE_APP_TO_DB[classe]).map((r) => r.chapitre))
  );

  const filtrees = rows.filter(
    (r) =>
      (filtreMatiere === TOUS || r.matiere_id === filtreMatiere) &&
      (filtreClasse === TOUS || r.classe === filtreClasse)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une question</CardTitle>
          <CardDescription>
            Elle rejoint la banque commune du centre — utilisée par les défis (tirage individuel) et la révision des élèves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Matière</Label>
              <Select
                items={Object.fromEntries(matieresAutorisees.map((m) => [m.id, m.nom]))}
                value={matiereId}
                onValueChange={(v) => v && setMatiereId(v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {matieresAutorisees.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Classe</Label>
              <Select
                items={Object.fromEntries(CLASSES.map((c) => [c, c]))}
                value={classe}
                onValueChange={(v) => v && setClasse(v as Classe)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chapitre">Chapitre</Label>
              <Input
                id="chapitre"
                list="chapitres-existants"
                value={chapitre}
                onChange={(e) => setChapitre(e.target.value)}
                placeholder="Ex. Équations du second degré"
              />
              <datalist id="chapitres-existants">
                {chapitresExistants.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question">Question</Label>
            <Input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. Quel est le discriminant de x² - 5x + 6 ?" />
          </div>
          <div className="space-y-1.5">
            <Label>Choix (coche la bonne réponse)</Label>
            <RadioGroup value={String(bonneReponse)} onValueChange={(v) => v && setBonneReponse(Number(v))}>
              {choix.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <RadioGroupItem value={String(ci)} aria-label={`Choix ${ci + 1} est la bonne réponse`} />
                  <Input
                    value={c}
                    onChange={(e) => setChoix((prev) => prev.map((x, i) => (i === ci ? e.target.value : x)))}
                    placeholder={`Choix ${ci + 1}`}
                    className="h-8"
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
          <Button onClick={ajouter} disabled={!formValide || envoi}>
            <Plus />
            {envoi ? "Ajout..." : "Ajouter à la banque"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Questions du centre ({filtrees.length})</CardTitle>
            </div>
            <div className="flex gap-2">
              <Select
                items={{ [TOUS]: "Toutes les matières", ...Object.fromEntries(matieresAutorisees.map((m) => [m.id, m.nom])) }}
                value={filtreMatiere}
                onValueChange={(v) => v && setFiltreMatiere(v)}
              >
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Toutes les matières</SelectItem>
                  {matieresAutorisees.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                items={{ [TOUS]: "Toutes les classes", ...Object.fromEntries(CLASSES.map((c) => [CLASSE_APP_TO_DB[c], c])) }}
                value={filtreClasse}
                onValueChange={(v) => v && setFiltreClasse(v)}
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Toutes les classes</SelectItem>
                  {CLASSES.map((c) => <SelectItem key={c} value={CLASSE_APP_TO_DB[c]}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {chargement ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filtrees.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Aucune question dans la banque"
              hint="Ajoute des questions ci-dessus — plus la banque est fournie, plus les tirages des défis sont variés."
            />
          ) : (
            filtrees.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getMatiere(r.matiere_id)?.nom}</Badge>
                    <Badge variant="secondary">{CLASSE_DB_TO_APP[r.classe]}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.chapitre}</Badge>
                  </div>
                  <p className="text-sm font-medium">{r.question}</p>
                  <p className="text-xs text-muted-foreground">
                    Bonne réponse : {r.choix[r.bonne_reponse_index]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la question"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => supprimer(r.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
