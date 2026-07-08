"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { CURRENT_TUTOR_ID, ANNEE_SCOLAIRE } from "@/lib/mock";
import type { Seance } from "@/lib/mock";
import { useStore } from "@/lib/store";

export default function TutorCahierPage() {
  const { getSeancesByRepetiteur, getMatiere, evaluations: toutesEvaluations, updateSeance, addEvaluation, getEleve } = useStore();
  const seances = getSeancesByRepetiteur(CURRENT_TUTOR_ID);
  const evaluations = toutesEvaluations.filter((e) => e.repetiteurId === CURRENT_TUTOR_ID);
  const [seanceOuverte, setSeanceOuverte] = useState<Seance | null>(null);
  const [contenu, setContenu] = useState("");
  const [present, setPresent] = useState(true);
  const [note, setNote] = useState("");
  const [remarque, setRemarque] = useState("");

  function ouvrir(seance: Seance) {
    setSeanceOuverte(seance);
    setContenu(seance.contenu ?? "");
    setPresent(seance.present ?? true);
    setNote("");
    setRemarque("");
  }

  function enregistrer() {
    if (!seanceOuverte) return;
    if (note.trim() && (Number.isNaN(Number(note)) || Number(note) < 0 || Number(note) > 20)) {
      toast.error("La note doit être comprise entre 0 et 20.");
      return;
    }
    updateSeance(seanceOuverte.id, { contenu, present, statut: "terminee" });
    if (note.trim() || remarque.trim()) {
      addEvaluation({
        id: `ev-${Date.now()}`,
        eleveId: seanceOuverte.eleveId,
        repetiteurId: CURRENT_TUTOR_ID,
        matiereId: seanceOuverte.matiereId,
        date: seanceOuverte.date,
        note: note.trim() ? Number(note) : null,
        remarque: remarque.trim(),
        visibleEleve: true,
        anneeScolaire: ANNEE_SCOLAIRE,
      });
    }
    const eleve = getEleve(seanceOuverte.eleveId);
    toast.success(
      note.trim() || remarque.trim()
        ? `Séance enregistrée — note et remarque visibles par ${eleve?.prenom} et ses parents`
        : "Séance enregistrée dans le cahier de texte"
    );
    setSeanceOuverte(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cahier de texte numérique</h1>
        <p className="text-sm text-muted-foreground">
          Fais l&apos;appel, note ce qui a été vu en séance et saisis une remarque ou une note.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes séances</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile : cartes empilées */}
          <div className="space-y-2 sm:hidden">
            {seances.map((seance) => (
              <div key={seance.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {getEleve(seance.eleveId)?.prenom} {getEleve(seance.eleveId)?.nom}
                  </span>
                  <StatusBadge status={seance.statut} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {getMatiere(seance.matiereId)?.nom} · {seance.date} · {seance.heureDebut} - {seance.heureFin}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => ouvrir(seance)}
                  disabled={seance.statut === "annulee"}
                >
                  <NotebookPen />
                  Ouvrir le cahier de texte
                </Button>
              </div>
            ))}
          </div>
          {/* Desktop : tableau */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Cahier de texte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seances.map((seance) => (
                  <TableRow key={seance.id}>
                    <TableCell className="font-medium">{getEleve(seance.eleveId)?.prenom} {getEleve(seance.eleveId)?.nom}</TableCell>
                    <TableCell>{getMatiere(seance.matiereId)?.nom}</TableCell>
                    <TableCell>{seance.date}</TableCell>
                    <TableCell>{seance.heureDebut} - {seance.heureFin}</TableCell>
                    <TableCell><StatusBadge status={seance.statut} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => ouvrir(seance)} disabled={seance.statut === "annulee"}>
                        <NotebookPen />
                        Ouvrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & remarques récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluations.slice(0, 6).map((ev) => (
            <div key={ev.id} className="rounded-lg border border-border px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{getEleve(ev.eleveId)?.prenom} {getEleve(ev.eleveId)?.nom} — {getMatiere(ev.matiereId)?.nom}</span>
                <span className="text-muted-foreground">{ev.date}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {ev.note !== null && <span className="text-sm font-semibold text-primary">{ev.note}/20</span>}
                <p className="text-sm text-muted-foreground">{ev.remarque}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!seanceOuverte} onOpenChange={(open) => !open && setSeanceOuverte(null)}>
        <DialogContent className="sm:max-w-lg">
          {seanceOuverte && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {getEleve(seanceOuverte.eleveId)?.prenom} {getEleve(seanceOuverte.eleveId)?.nom} — {getMatiere(seanceOuverte.matiereId)?.nom}
                </DialogTitle>
                <DialogDescription>{seanceOuverte.date} · {seanceOuverte.heureDebut}-{seanceOuverte.heureFin} · {seanceOuverte.lieu}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label htmlFor="present" className="text-sm">Élève présent</Label>
                  <Switch id="present" checked={present} onCheckedChange={setPresent} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contenu">Contenu de la séance (cahier de texte)</Label>
                  <Textarea id="contenu" value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Ce qui a été vu en séance..." rows={3} />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Note /20</Label>
                    <Input id="note" type="number" min={0} max={20} step={0.5} value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="remarque">Remarque</Label>
                    <Input id="remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} placeholder="Visible par l'élève et le parent" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={enregistrer}>Enregistrer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
