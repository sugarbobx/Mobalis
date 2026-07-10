"use client";

import { useState } from "react";
import { Plus, ListChecks, PenLine, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
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
import type { QuestionQCM, TypeExercice } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

const TYPE_LABELS: Record<TypeExercice, string> = { qcm: "QCM", libre: "Réponse libre", diagnostic: "Diagnostic (positionnement)" };

export default function TutorExercisesPage() {
  const { exercices, assignations: toutesAssignations, getMatiere, getExercice, addExercice, addAssignation, getEleve, getRepetiteur } = useStore();
  const CURRENT_TUTOR_ID = useCurrentUser().id;
  const tutor = getRepetiteur(CURRENT_TUTOR_ID) ?? { id: "", nom: "", prenom: "", matiereIds: [], eleveIds: [], avatarInitiales: "" };
  const assignations = toutesAssignations.filter((a) => a.repetiteurAssignantId === CURRENT_TUTOR_ID);

  const disponibles = exercices.filter(
    (e) => e.dansBibliotheque || e.createurId === CURRENT_TUTOR_ID
  );

  // --- Assignation ---
  const [exerciceId, setExerciceId] = useState(disponibles[0]?.id ?? "");
  const [elevesChoisis, setElevesChoisis] = useState<string[]>([]);
  const [echeance, setEcheance] = useState("2026-07-15");

  function toggleEleve(id: string) {
    setElevesChoisis((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function assigner() {
    if (!exerciceId || elevesChoisis.length === 0) return;
    await addAssignation({
      exerciceId,
      eleveIds: elevesChoisis,
      repetiteurAssignantId: CURRENT_TUTOR_ID,
      dateAssignation: "2026-07-05",
      dateEcheance: echeance,
      statut: "a_faire",
    });
    const noms = elevesChoisis.map((id) => getEleve(id)?.prenom).filter(Boolean).join(", ");
    toast.success(`« ${getExercice(exerciceId)?.titre} » assigné à ${noms}`);
    setElevesChoisis([]);
  }

  // --- Création d'exercice ---
  const [openCreate, setOpenCreate] = useState(false);
  const [titre, setTitre] = useState("");
  const [matiereId, setMatiereId] = useState(tutor.matiereIds[0] ?? "");
  const [type, setType] = useState<TypeExercice>("libre");
  const [consigne, setConsigne] = useState("");
  const [enonce, setEnonce] = useState("");
  const [partager, setPartager] = useState(false);
  const [questions, setQuestions] = useState<QuestionQCM[]>([questionVide()]);

  const formValide = titre.trim().length > 0 && !!matiereId && (type !== "qcm" || questionsValides(questions));

  async function creerExercice() {
    if (!formValide) return;
    const nouveau = {
      matiereId,
      type,
      titre: titre.trim(),
      consigne: consigne.trim() || "Consigne à préciser.",
      createur: "repetiteur" as const,
      createurId: CURRENT_TUTOR_ID,
      dansBibliotheque: partager,
      ...(type === "qcm"
        ? { questions: questions.map((q) => ({ ...q, question: q.question.trim(), choix: q.choix.map((c) => c.trim()) })) }
        : { enonce: enonce.trim() || "Énoncé à préciser." }),
    };
    const created = await addExercice(nouveau);
    setExerciceId(created.id);
    toast.success(
      partager
        ? `Exercice « ${nouveau.titre} » créé et partagé dans la bibliothèque`
        : `Exercice « ${nouveau.titre} » créé`
    );
    setTitre("");
    setConsigne("");
    setEnonce("");
    setPartager(false);
    setQuestions([questionVide()]);
    setOpenCreate(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Exercices</h1>
          <p className="text-sm text-muted-foreground">
            Choisis un exercice de la bibliothèque ou crée le tien, puis assigne-le à un élève ou un groupe.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger render={<Button variant="outline" />}>
            <Plus />
            Créer un exercice
          </DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un exercice</DialogTitle>
              <DialogDescription>Propre à un élève/groupe, ou partagé avec le centre.</DialogDescription>
            </DialogHeader>
            <div className="-mx-1 space-y-3 overflow-y-auto px-1">
              <div className="space-y-1.5">
                <Label htmlFor="titre">Titre</Label>
                <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Matière</Label>
                  <Select
                    items={Object.fromEntries(tutor.matiereIds.map((id) => [id, getMatiere(id)?.nom ?? id]))}
                    value={matiereId}
                    onValueChange={(v) => v && setMatiereId(v)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tutor.matiereIds.map((id) => (
                        <SelectItem key={id} value={id}>{getMatiere(id)?.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    items={TYPE_LABELS}
                    value={type}
                    onValueChange={(v) => v && setType(v as TypeExercice)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qcm">QCM</SelectItem>
                      <SelectItem value="libre">Réponse libre</SelectItem>
                      <SelectItem value="diagnostic">Diagnostic (positionnement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consigne">Consigne</Label>
                <Textarea id="consigne" value={consigne} onChange={(e) => setConsigne(e.target.value)} />
              </div>
              {(type === "libre" || type === "diagnostic") && (
                <div className="space-y-1.5">
                  <Label htmlFor="enonce">Énoncé</Label>
                  <Textarea id="enonce" value={enonce} onChange={(e) => setEnonce(e.target.value)} />
                </div>
              )}
              {type === "qcm" && (
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <QcmBuilder questions={questions} onChange={setQuestions} />
                </div>
              )}
              {type === "diagnostic" ? (
                <p className="text-xs text-muted-foreground">
                  Exercice de positionnement pour un nouvel élève — résultat visible par toi et l&apos;administration, pas par le parent ni noté formellement.
                </p>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={partager} onCheckedChange={(c) => setPartager(c === true)} />
                  Partager dans la bibliothèque commune du centre
                </label>
              )}
            </div>
            <DialogFooter>
              <Button onClick={creerExercice} disabled={!formValide}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigner un exercice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Exercice</Label>
            <Select
              items={Object.fromEntries(disponibles.map((ex) => [ex.id, `${ex.titre} · ${getMatiere(ex.matiereId)?.nom}`]))}
              value={exerciceId}
              onValueChange={(v) => v && setExerciceId(v)}
            >
              <SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                {disponibles.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.titre} · {getMatiere(ex.matiereId)?.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Élève(s) / groupe</Label>
            <div className="flex flex-wrap gap-3">
              {tutor.eleveIds.map((id) => {
                const eleve = getEleve(id)!;
                return (
                  <label key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <Checkbox checked={elevesChoisis.includes(id)} onCheckedChange={() => toggleEleve(id)} />
                    {eleve.prenom} {eleve.nom}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="echeance">Date d&apos;échéance</Label>
            <Input id="echeance" type="date" className="w-48" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </div>
          <Button onClick={assigner} disabled={elevesChoisis.length === 0}>
            <Send />
            Assigner
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes assignations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile : cartes empilées */}
          <div className="space-y-2 sm:hidden">
            {assignations.map((a) => {
              const exercice = getExercice(a.exerciceId)!;
              return (
                <div key={a.id} className="space-y-1.5 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {exercice.type === "qcm" ? <ListChecks className="size-3.5 shrink-0" /> : <PenLine className="size-3.5 shrink-0" />}
                      {exercice.titre}
                    </span>
                    <StatusBadge status={a.statut} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.eleveIds.map((id) => getEleve(id)?.prenom).join(", ")} · échéance {a.dateEcheance}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Desktop : tableau */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercice</TableHead>
                  <TableHead>Élève(s)</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignations.map((a) => {
                  const exercice = getExercice(a.exerciceId)!;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          {exercice.type === "qcm" ? <ListChecks className="size-3.5" /> : <PenLine className="size-3.5" />}
                          {exercice.titre}
                        </span>
                      </TableCell>
                      <TableCell>{a.eleveIds.map((id) => getEleve(id)?.prenom).join(", ")}</TableCell>
                      <TableCell>{a.dateEcheance}</TableCell>
                      <TableCell><StatusBadge status={a.statut} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
