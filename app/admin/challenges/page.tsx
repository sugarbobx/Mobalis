"use client";

import { useEffect, useState } from "react";
import { Plus, Swords, CalendarRange, TrendingUp, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { MiniLineChart } from "@/components/shared/mini-line-chart";
import { QuestionBank } from "@/components/shared/question-bank";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { createClient } from "@/utils/supabase/client";
import type { Classe } from "@/lib/mock";

const CLASSES: Classe[] = ["2nde", "1ère", "Tle"];
const CLASSE_APP_TO_DB: Record<Classe, string> = { "2nde": "2nde", "1ère": "1ere", Tle: "tle" };
const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };

interface DefiRow {
  id: string;
  type: string;
  titre: string;
  classe: string;
  nb_questions: number;
  points_base: number;
  date_debut: string;
  date_fin: string;
  participations: { eleve_id: string; score: number | null; points: number | null; submitted_at: string | null }[];
}

function moisCourantIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminChallengesPage() {
  const { eleves, getMatieresActives } = useStore();
  const adminId = useCurrentUser().id;
  const [defis, setDefis] = useState<DefiRow[]>([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const supabase = createClient();
    const { data } = await supabase
      .from("defis")
      .select("id, type, titre, classe, nb_questions, points_base, date_debut, date_fin, defi_participations(eleve_id, score, points, submitted_at)")
      .order("date_debut", { ascending: false });
    setDefis(
      ((data ?? []) as (Omit<DefiRow, "participations"> & { defi_participations: DefiRow["participations"] })[]).map((d) => ({
        ...d,
        participations: d.defi_participations,
      }))
    );
    setChargement(false);
  }

  useEffect(() => {
    void charger();
  }, []);

  const mensuels = defis.filter((d) => d.type === "mensuel");
  const hebdos = defis.filter((d) => d.type === "hebdo");

  // --- création défi mensuel ---
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [classe, setClasse] = useState<Classe>("2nde");
  const [mois, setMois] = useState(moisCourantIso());
  const [nbQuestions, setNbQuestions] = useState("5");
  const [pointsBase, setPointsBase] = useState("200");
  const [envoi, setEnvoi] = useState(false);

  const formValide = titre.trim().length > 0 && /^\d{4}-\d{2}$/.test(mois) && Number(nbQuestions) >= 2;

  async function creerDefiMensuel() {
    if (!formValide) return;
    setEnvoi(true);
    const [annee, moisNum] = mois.split("-").map(Number);
    const debut = `${mois}-01`;
    const fin = new Date(annee, moisNum, 0); // dernier jour du mois
    const finIso = `${mois}-${String(fin.getDate()).padStart(2, "0")}`;
    const supabase = createClient();
    const { error } = await supabase.from("defis").insert({
      type: "mensuel",
      titre: titre.trim(),
      matiere_id: null,
      classe: CLASSE_APP_TO_DB[classe],
      nb_questions: Number(nbQuestions),
      points_base: Number(pointsBase) || 200,
      date_debut: debut,
      date_fin: finIso,
      created_by: adminId,
    });
    setEnvoi(false);
    if (error) {
      toast.error(`Échec de création : ${error.message}`);
      return;
    }
    toast.success(`Défi mensuel « ${titre.trim()} » publié pour la ${classe}`);
    setOpen(false);
    setTitre("");
    void charger();
  }

  // Progression annuelle : score moyen des défis mensuels, par mois et par classe.
  function serieProgression(classeDb: string): { label: string; value: number }[] {
    return mensuels
      .filter((d) => d.classe === classeDb)
      .map((d) => {
        const soumises = d.participations.filter((p) => p.submitted_at);
        if (soumises.length === 0) return null;
        return {
          label: d.date_debut.slice(0, 7),
          value: Math.round(soumises.reduce((acc, p) => acc + (p.score ?? 0), 0) / soumises.length),
        };
      })
      .filter((x): x is { label: string; value: number } => x !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Défis — tour de contrôle</h1>
          <p className="text-sm text-muted-foreground">
            Défis mensuels multi-matières (classement annuel), suivi des défis hebdo des répétiteurs, progression du centre.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Défi mensuel
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Publier un défi mensuel</DialogTitle>
              <DialogDescription>
                Chaque élève de la classe reçoit un tirage couvrant toutes les matières de SON programme — les points alimentent le classement annuel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="titre-mensuel">Titre</Label>
                <Input id="titre-mensuel" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Grand défi de juillet" />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label htmlFor="mois">Mois</Label>
                  <Input id="mois" type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nbq-mensuel">Questions par matière</Label>
                  <Input id="nbq-mensuel" type="number" min={2} max={15} value={nbQuestions} onChange={(e) => setNbQuestions(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pts">Points de base</Label>
                  <Input id="pts" type="number" min={50} max={1000} value={pointsBase} onChange={(e) => setPointsBase(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le tirage se fait par élève selon SES matières suivies — assure-toi que la banque couvre chaque matière du programme (page Banque de questions ci-dessous).
              </p>
            </div>
            <DialogFooter>
              <Button onClick={creerDefiMensuel} disabled={!formValide || envoi}>
                {envoi ? "Publication..." : "Publier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="mensuels">
        <TabsList>
          <TabsTrigger value="mensuels">Défis mensuels</TabsTrigger>
          <TabsTrigger value="hebdos">Défis hebdo (répétiteurs)</TabsTrigger>
          <TabsTrigger value="progression">Progression annuelle</TabsTrigger>
          <TabsTrigger value="banque">Banque de questions</TabsTrigger>
        </TabsList>

        <TabsContent value="mensuels" className="mt-4">
          <TableDefis defis={mensuels} eleves={eleves} chargement={chargement}
            vide="Aucun défi mensuel — publie le premier avec le bouton ci-dessus." />
        </TabsContent>

        <TabsContent value="hebdos" className="mt-4">
          <TableDefis defis={hebdos} eleves={eleves} chargement={chargement}
            vide="Aucun défi hebdo publié par les répétiteurs pour l'instant." />
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4" /> Score moyen des défis mensuels</CardTitle>
              <CardDescription>Par classe, mois après mois — la trajectoire du centre sur l&apos;année.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {CLASSES.map((c) => (
                <div key={c} className="space-y-2">
                  <span className="text-sm font-medium">{c}</span>
                  <MiniLineChart data={serieProgression(CLASSE_APP_TO_DB[c])} max={100} unit="/100" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banque" className="mt-4">
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ListChecks className="size-4" /> En tant qu&apos;admin, tu peux alimenter toutes les matières.
            </p>
            <QuestionBank matieresAutorisees={getMatieresActives()} createdBy={adminId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TableDefis({
  defis,
  eleves,
  chargement,
  vide,
}: {
  defis: DefiRow[];
  eleves: { id: string; classe: Classe; statutCompte: string }[];
  chargement: boolean;
  vide: string;
}) {
  if (chargement) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (defis.length === 0) {
    return <EmptyState icon={Swords} title={vide} hint="Les défis apparaissent ici dès leur publication." />;
  }
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Fenêtre</TableHead>
              <TableHead>Participation</TableHead>
              <TableHead>Score moyen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defis.map((d) => {
              const elevesClasse = eleves.filter(
                (e) => CLASSE_APP_TO_DB[e.classe] === d.classe && e.statutCompte === "actif"
              );
              const soumises = d.participations.filter((p) => p.submitted_at);
              const moyenne =
                soumises.length > 0
                  ? Math.round(soumises.reduce((acc, p) => acc + (p.score ?? 0), 0) / soumises.length)
                  : null;
              const taux = elevesClasse.length > 0 ? Math.round((100 * soumises.length) / elevesClasse.length) : 0;
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.titre}</TableCell>
                  <TableCell><Badge variant="outline">{CLASSE_DB_TO_APP[d.classe]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CalendarRange className="size-3.5" /> {d.date_debut} → {d.date_fin}</span>
                  </TableCell>
                  <TableCell>{soumises.length}/{elevesClasse.length} ({taux}%)</TableCell>
                  <TableCell>{moyenne !== null ? `${moyenne}/100` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
