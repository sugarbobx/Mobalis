"use client";

import { CreditCard, GraduationCap, MessageSquareText, Target, Bell } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { MiniLineChart } from "@/components/shared/mini-line-chart";
import { getPaiementsByEleve, getRepetiteur, CURRENT_PARENT_ID } from "@/lib/mock";
import { useStore } from "@/lib/store";

const FREQUENCE_ITEMS = { immediat: "Immédiate", hebdomadaire: "Hebdomadaire" };

export default function ParentDashboardPage() {
  const { getParent, getEleve, updatePreferencesNotification } = useStore();
  const parent = getParent(CURRENT_PARENT_ID)!;
  const enfants = parent.eleveIds.map((id) => getEleve(id)!);
  const prefs = parent.preferencesNotification;

  function toggle(cle: "notes" | "absences" | "remarques" | "paiements") {
    updatePreferencesNotification(parent.id, { [cle]: !prefs[cle] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Suivi de mon enfant</h1>
        <p className="text-sm text-muted-foreground">
          Notes, remarques, paiements et progression sur les exercices.
        </p>
      </div>

      <Tabs defaultValue={enfants[0]?.id}>
        <TabsList>
          {enfants.map((enfant) => (
            <TabsTrigger key={enfant.id} value={enfant.id}>{enfant.prenom}</TabsTrigger>
          ))}
        </TabsList>
        {enfants.map((enfant) => (
          <TabsContent key={enfant.id} value={enfant.id} className="mt-4 space-y-6">
            <EnfantROI eleveId={enfant.id} />
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="size-4" /> Préférences de notification</CardTitle>
          <CardDescription>Notes et absences sont activées par défaut ; le reste est configurable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              Nouvelles notes
              <Switch checked={prefs.notes} onCheckedChange={() => toggle("notes")} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              Absences
              <Switch checked={prefs.absences} onCheckedChange={() => toggle("absences")} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              Remarques des répétiteurs
              <Switch checked={prefs.remarques} onCheckedChange={() => toggle("remarques")} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              Paiements
              <Switch checked={prefs.paiements} onCheckedChange={() => toggle("paiements")} />
            </label>
          </div>
          <div className="space-y-1.5 sm:max-w-56">
            <Label>Fréquence</Label>
            <Select
              items={FREQUENCE_ITEMS}
              value={prefs.frequence}
              onValueChange={(v) => v && updatePreferencesNotification(parent.id, { frequence: v as "immediat" | "hebdomadaire" })}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediat">Immédiate</SelectItem>
                <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnfantROI({ eleveId }: { eleveId: string }) {
  const { getEvaluationsByMatiere, getDevoirsByEleve, getScoreMoyen, getMatiere, getEleve, getBulletinsByEleve } = useStore();
  const eleve = getEleve(eleveId)!;
  const bulletins = getBulletinsByEleve(eleveId);
  const paiements = getPaiementsByEleve(eleveId);
  // Les exercices "diagnostic" (positionnement) ne sont pas visibles côté parent (§2.2/§3.3).
  const devoirs = getDevoirsByEleve(eleveId).filter((d) => d.exercice.type !== "diagnostic");
  const devoirsCorriges = devoirs.filter((d) => d.assignation.statut === "corrige");
  const devoirsEnAttenteCorrection = devoirs.filter((d) => d.assignation.statut === "fait");
  const scoreMoyen = getScoreMoyen(eleveId);
  const paiementsEnAttente = paiements.filter((p) => p.statut !== "paye").length;
  const remarques = eleve.matiereIds
    .flatMap((matiereId) => getEvaluationsByMatiere(eleveId, matiereId))
    .filter((e) => e.remarque)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Classe" value={`${eleve.classe} · ${eleve.serie}`} icon={GraduationCap} />
        <StatCard
          label="Exercices corrigés"
          value={`${devoirsCorriges.length}/${devoirs.length}`}
          icon={Target}
          accent
          hint={devoirsEnAttenteCorrection.length > 0 ? `${devoirsEnAttenteCorrection.length} en attente de correction` : undefined}
        />
        <StatCard label="Score moyen aux exercices" value={scoreMoyen !== null ? `${scoreMoyen}/100` : "—"} icon={Target} />
        <StatCard label="Paiements à régler" value={paiementsEnAttente} icon={CreditCard} hint={paiementsEnAttente > 0 ? "à traiter" : "à jour"} />
      </div>

      {bulletins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulletins annuels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bulletins.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">Année {b.anneeScolaire}</p>
                  <p className="text-muted-foreground">{b.appreciationGenerale}</p>
                </div>
                <span className="text-lg font-semibold text-primary">{b.moyenneGenerale}/20</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Évolution des notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {eleve.matiereIds.map((matiereId) => {
            const evals = getEvaluationsByMatiere(eleveId, matiereId).filter((e) => e.note !== null);
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
          <CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4" /> Remarques des répétiteurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {remarques.slice(0, 6).map((r) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Paiements & reçus</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motif</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.motif}</TableCell>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.montant} €</TableCell>
                  <TableCell><StatusBadge status={p.statut} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
