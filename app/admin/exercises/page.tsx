"use client";

import { useState } from "react";
import { Plus, ListChecks, PenLine, Library } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QcmBuilder, questionVide, questionsValides } from "@/components/shared/qcm-builder";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import type { Exercice, QuestionQCM } from "@/lib/mock";

// L'admin gère la bibliothèque commune : QCM et réponse libre uniquement.
// Les exercices "diagnostic" sont créés par le répétiteur, à l'entrée d'un élève (§2.2).
const TYPE_LABELS: Record<"qcm" | "libre", string> = { qcm: "QCM", libre: "Réponse libre" };

export default function AdminExercisesPage() {
  const { exercices, getMatieresActives, addExercice } = useStore();
  const CURRENT_ADMIN_ID = useCurrentUser().id;
  const [open, setOpen] = useState(false);
  const matieresActives = getMatieresActives();

  const [titre, setTitre] = useState("");
  const [matiereId, setMatiereId] = useState(matieresActives[0]?.id ?? "");
  const [type, setType] = useState<"qcm" | "libre">("qcm");
  const [consigne, setConsigne] = useState("");
  const [enonce, setEnonce] = useState("");
  const [questions, setQuestions] = useState<QuestionQCM[]>([questionVide()]);

  const formValide = titre.trim().length > 0 && !!matiereId && (type !== "qcm" || questionsValides(questions));

  function resetForm() {
    setTitre("");
    setMatiereId(matieresActives[0]?.id ?? "");
    setType("qcm");
    setConsigne("");
    setEnonce("");
    setQuestions([questionVide()]);
  }

  async function creerExercice() {
    if (!formValide) return;
    const nouveau = {
      matiereId,
      type,
      titre: titre.trim(),
      consigne: consigne.trim() || "Consigne à préciser.",
      createur: "admin" as const,
      createurId: CURRENT_ADMIN_ID,
      dansBibliotheque: true,
      ...(type === "qcm"
        ? { questions: questions.map((q) => ({ ...q, question: q.question.trim(), choix: q.choix.map((c) => c.trim()) })) }
        : { enonce: enonce.trim() || "Énoncé à préciser." }),
    };
    await addExercice(nouveau);
    resetForm();
    setOpen(false);
    toast.success(`Exercice « ${nouveau.titre} » ajouté à la bibliothèque`);
  }

  const bibliotheque = exercices.filter((e) => e.dansBibliotheque);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bibliothèque d&apos;exercices</h1>
          <p className="text-sm text-muted-foreground">
            Base d&apos;exercices réutilisables par matière, à disposition de tous les répétiteurs.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Nouvel exercice
          </DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un exercice</DialogTitle>
              <DialogDescription>Il sera ajouté à la bibliothèque partagée du centre.</DialogDescription>
            </DialogHeader>
            <div className="-mx-1 space-y-3 overflow-y-auto px-1">
              <div className="space-y-1.5">
                <Label htmlFor="titre">Titre</Label>
                <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Les fractions" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Matière</Label>
                  <Select
                    items={Object.fromEntries(matieresActives.map((m) => [m.id, m.nom]))}
                    value={matiereId}
                    onValueChange={(v) => v && setMatiereId(v)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {matieresActives.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    items={TYPE_LABELS}
                    value={type}
                    onValueChange={(v) => v && setType(v as "qcm" | "libre")}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qcm">QCM</SelectItem>
                      <SelectItem value="libre">Réponse libre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consigne">Consigne</Label>
                <Textarea id="consigne" value={consigne} onChange={(e) => setConsigne(e.target.value)} placeholder="Ex. Une seule bonne réponse par question." />
              </div>
              {type === "libre" && (
                <div className="space-y-1.5">
                  <Label htmlFor="enonce">Énoncé</Label>
                  <Textarea id="enonce" value={enonce} onChange={(e) => setEnonce(e.target.value)} placeholder="Rédige l'énoncé de l'exercice à réponse libre." />
                </div>
              )}
              {type === "qcm" && (
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <QcmBuilder questions={questions} onChange={setQuestions} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={creerExercice} disabled={!formValide}>Créer l&apos;exercice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tous">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="tous">Toutes les matières</TabsTrigger>
          {matieresActives.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>{m.nom}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="tous" className="mt-4">
          <ExerciceGrid exercices={bibliotheque} />
        </TabsContent>
        {matieresActives.map((m) => (
          <TabsContent key={m.id} value={m.id} className="mt-4">
            <ExerciceGrid exercices={bibliotheque.filter((e) => e.matiereId === m.id)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ExerciceGrid({ exercices }: { exercices: Exercice[] }) {
  const { getMatiere } = useStore();
  if (exercices.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Aucun exercice pour cette matière"
        hint="Crée un exercice avec le bouton « Nouvel exercice » — il sera visible par tous les répétiteurs."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {exercices.map((ex) => (
        <Card key={ex.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant={ex.type === "qcm" ? "default" : "secondary"} className="gap-1">
                {ex.type === "qcm" ? <ListChecks className="size-3" /> : <PenLine className="size-3" />}
                {ex.type === "qcm" ? "QCM" : "Réponse libre"}
              </Badge>
              <Badge variant="outline">{getMatiere(ex.matiereId)?.nom}</Badge>
            </div>
            <CardTitle className="text-base">{ex.titre}</CardTitle>
            <CardDescription>{ex.consigne}</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {ex.type === "qcm"
              ? `${ex.questions?.length ?? 0} question(s)`
              : "Correction manuelle par le répétiteur"}
            {" · "}
            créé par {ex.createur === "admin" ? "l'administration" : "un répétiteur"}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
