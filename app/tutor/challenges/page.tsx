"use client";

import { useEffect, useState } from "react";
import { Plus, Swords, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { createClient } from "@/utils/supabase/client";
import { lundiDeLaSemaine } from "@/lib/defis";
import { dateLocaleISO } from "@/lib/dates";
import type { Classe } from "@/lib/mock";

const CLASSE_APP_TO_DB: Record<Classe, string> = { "2nde": "2nde", "1ère": "1ere", Tle: "tle" };
const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };

interface DefiRow {
  id: string;
  type: string;
  titre: string;
  matiere_id: string | null;
  classe: string;
  nb_questions: number;
  date_debut: string;
  date_fin: string;
  participations: { eleve_id: string; score: number | null; submitted_at: string | null }[];
}

export default function TutorChallengesPage() {
  const { getMatiere, getRepetiteur, getEleve, eleves } = useStore();
  const tutorId = useCurrentUser().id;
  const tutor = getRepetiteur(tutorId);
  const mesMatieres = (tutor?.matiereIds ?? []).map((id) => getMatiere(id)).filter((m) => !!m);
  // Classes où ce répétiteur a au moins un élève — seules cibles autorisées (RLS l'impose aussi).
  const mesClasses = Array.from(
    new Set((tutor?.eleveIds ?? []).map((id) => getEleve(id)?.classe).filter((c): c is Classe => !!c))
  );

  const [defis, setDefis] = useState<DefiRow[]>([]);
  const [banque, setBanque] = useState<Record<string, number>>({}); // "matiereId|classeDb" -> nb questions
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const supabase = createClient();
    const [{ data: defisData }, { data: questionsData }] = await Promise.all([
      supabase
        .from("defis")
        .select("id, type, titre, matiere_id, classe, nb_questions, date_debut, date_fin, defi_participations(eleve_id, score, submitted_at)")
        .eq("type", "hebdo")
        .order("date_debut", { ascending: false }),
      supabase.from("questions").select("matiere_id, classe"),
    ]);
    setDefis(
      ((defisData ?? []) as (Omit<DefiRow, "participations"> & { defi_participations: DefiRow["participations"] })[]).map(
        (d) => ({ ...d, participations: d.defi_participations })
      )
    );
    const compte: Record<string, number> = {};
    for (const q of (questionsData ?? []) as { matiere_id: string; classe: string }[]) {
      const cle = `${q.matiere_id}|${q.classe}`;
      compte[cle] = (compte[cle] ?? 0) + 1;
    }
    setBanque(compte);
    setChargement(false);
  }

  useEffect(() => {
    void charger();
  }, []);

  // --- création ---
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [classe, setClasse] = useState<Classe | "">("");
  const [nbQuestions, setNbQuestions] = useState("10");
  const [dateDebut, setDateDebut] = useState(dateLocaleISO(lundiDeLaSemaine(new Date())));
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!matiereId && mesMatieres.length > 0) setMatiereId(mesMatieres[0].id);
    if (!classe && mesClasses.length > 0) setClasse(mesClasses[0]);
  }, [mesMatieres, mesClasses, matiereId, classe]);

  const nbDisponibles = matiereId && classe ? (banque[`${matiereId}|${CLASSE_APP_TO_DB[classe]}`] ?? 0) : 0;
  const nbDemande = Number(nbQuestions) || 0;
  const banquePauvre = nbDisponibles < nbDemande * 2;
  const formValide = titre.trim().length > 0 && !!matiereId && !!classe && nbDemande >= 3 && nbDisponibles >= nbDemande;

  async function creerDefi() {
    if (!formValide || !classe) return;
    setEnvoi(true);
    const debut = new Date(`${dateDebut}T00:00:00`);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    const supabase = createClient();
    const { error } = await supabase.from("defis").insert({
      type: "hebdo",
      titre: titre.trim(),
      matiere_id: matiereId,
      classe: CLASSE_APP_TO_DB[classe],
      nb_questions: nbDemande,
      date_debut: dateDebut,
      date_fin: dateLocaleISO(fin),
      created_by: tutorId,
    });
    setEnvoi(false);
    if (error) {
      toast.error(`Échec de création : ${error.message}`);
      return;
    }
    toast.success(`Défi « ${titre.trim()} » publié pour la ${classe}`);
    setOpen(false);
    setTitre("");
    void charger();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Défis hebdomadaires</h1>
          <p className="text-sm text-muted-foreground">
            Publie un défi pour une de tes classes — chaque élève reçoit un tirage différent depuis la banque de questions.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Nouveau défi
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Publier un défi hebdomadaire</DialogTitle>
              <DialogDescription>
                Fenêtre d&apos;une semaine. Les questions sont tirées au hasard dans la banque — pas de QCM à rédiger ici.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="titre-defi">Titre</Label>
                <Input id="titre-defi" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Défi SVT — semaine 28" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Matière (les tiennes)</Label>
                  <Select
                    items={Object.fromEntries(mesMatieres.map((m) => [m.id, m.nom]))}
                    value={matiereId}
                    onValueChange={(v) => v && setMatiereId(v)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mesMatieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Classe (tes élèves)</Label>
                  <Select
                    items={Object.fromEntries(mesClasses.map((c) => [c, c]))}
                    value={classe}
                    onValueChange={(v) => v && setClasse(v as Classe)}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mesClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nb-q">Questions par élève</Label>
                  <Input id="nb-q" type="number" min={3} max={30} value={nbQuestions} onChange={(e) => setNbQuestions(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-debut">Début (semaine complète)</Label>
                  <Input id="date-debut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Banque disponible pour cette matière/classe : {nbDisponibles} question{nbDisponibles > 1 ? "s" : ""}.
              </p>
              {banquePauvre && nbDisponibles >= nbDemande && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Moins de {nbDemande * 2} questions en banque — les tirages des élèves se ressembleront beaucoup. Ajoute des questions pour plus de variété.
                </p>
              )}
              {nbDisponibles < nbDemande && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Banque insuffisante ({nbDisponibles}/{nbDemande}) — ajoute des questions dans la Banque de questions avant de publier.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={creerDefi} disabled={!formValide || envoi}>
                {envoi ? "Publication..." : "Publier le défi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Swords className="size-4" /> Mes défis publiés</CardTitle>
          <CardDescription>Participation et score moyen — relance les absents en séance.</CardDescription>
        </CardHeader>
        <CardContent>
          {chargement ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : defis.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="Aucun défi publié"
              hint="Publie ton premier défi — pense à remplir la banque de questions d'abord."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Semaine</TableHead>
                  <TableHead>Participation</TableHead>
                  <TableHead>Score moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defis.map((d) => {
                  const elevesClasse = eleves.filter((e) => CLASSE_APP_TO_DB[e.classe] === d.classe && e.statutCompte === "actif");
                  const soumises = d.participations.filter((p) => p.submitted_at);
                  const nonParticipants = elevesClasse.filter((e) => !soumises.some((p) => p.eleve_id === e.id));
                  const moyenne =
                    soumises.length > 0
                      ? Math.round(soumises.reduce((acc, p) => acc + (p.score ?? 0), 0) / soumises.length)
                      : null;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.titre}</TableCell>
                      <TableCell><Badge variant="outline">{d.matiere_id ? getMatiere(d.matiere_id)?.nom : "—"}</Badge></TableCell>
                      <TableCell>{CLASSE_DB_TO_APP[d.classe]}</TableCell>
                      <TableCell className="text-muted-foreground">{d.date_debut} → {d.date_fin}</TableCell>
                      <TableCell>
                        <span title={nonParticipants.length > 0 ? `Manquent : ${nonParticipants.map((e) => e.prenom).join(", ")}` : undefined}>
                          {soumises.length}/{elevesClasse.length}
                        </span>
                      </TableCell>
                      <TableCell>{moyenne !== null ? `${moyenne}/100` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
