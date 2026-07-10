"use client";

import { useEffect, useState } from "react";
import { CreditCard, GraduationCap, MessageSquareText, Target, Bell, MessageCircle, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { MiniLineChart } from "@/components/shared/mini-line-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { getMesNotifications, type Notification } from "@/lib/notifications";
import { confirmerPaiement, type MethodePaiement } from "@/lib/paiements-mobile-money";
import { BulletinDownloadButton } from "@/components/shared/bulletin-download-button";
import { getSequences, type Sequence } from "@/lib/bulletin-sequentiel";

const FREQUENCE_ITEMS = { immediat: "Immédiate", hebdomadaire: "Hebdomadaire" };

export default function ParentDashboardPage() {
  const { getParent, getEleve, updatePreferencesNotification } = useStore();
  const parentRow = getParent(useCurrentUser().id);
  if (!parentRow) return null;
  const parent = parentRow;
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

      <NotificationsRecues />

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

function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Aperçu façon WhatsApp de ce que le parent recevrait sur son téléphone —
 * l'envoi réel est mocké (voir migration 0008), seul l'historique est réel.
 */
function NotificationsRecues() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    getMesNotifications().then(setNotifications);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="size-4 text-emerald-500" /> Notifications</CardTitle>
        <CardDescription>
          Aperçu de ce que tu recevrais sur WhatsApp — le canal réel sera activé prochainement, ceci est une démonstration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications === null ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Aucune notification pour l'instant"
            hint="Les nouvelles notes, absences, remarques et paiements apparaîtront ici selon tes préférences ci-dessous."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="max-w-md self-start rounded-lg rounded-tl-none bg-emerald-500/10 px-3 py-2 text-sm">
                <p>{n.contenu}</p>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{formatDateHeure(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnfantROI({ eleveId }: { eleveId: string }) {
  const { getEvaluationsByMatiere, getDevoirsByEleve, getScoreMoyen, getMatiere, getEleve, getBulletinsByEleve, getPaiementsByEleve, getRepetiteur, marquerPaiementConfirme } = useStore();
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
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  useEffect(() => {
    void getSequences().then((s) => {
      setSequences(s);
      if (s.length > 0) setSequenceId(s[s.length - 1].id);
    });
  }, []);

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
            <CardTitle>Bulletin par séquence</CardTitle>
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
            {sequenceId && <BulletinDownloadButton eleveId={eleveId} sequenceId={sequenceId} />}
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.motif}</TableCell>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.montant.toLocaleString("fr-FR")} FCFA</TableCell>
                  <TableCell><StatusBadge status={p.statut} /></TableCell>
                  <TableCell className="text-right">
                    {p.statut !== "paye" && (
                      <PayerDialog paiementId={p.id} montant={p.montant} motif={p.motif} onConfirme={() => marquerPaiementConfirme(p.id)} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const USSD_CODES: Record<MethodePaiement, string> = { mtn: "*126#", orange: "#150#" };

function PayerDialog({
  paiementId,
  montant,
  motif,
  onConfirme,
}: {
  paiementId: string;
  montant: number;
  motif: string;
  onConfirme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [methode, setMethode] = useState<MethodePaiement | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function payer(m: MethodePaiement) {
    setMethode(m);
    setEnCours(true);
    try {
      const res = await confirmerPaiement(paiementId, m);
      setReference(res.reference);
      onConfirme();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du paiement");
      setMethode(null);
    } finally {
      setEnCours(false);
    }
  }

  function fermer() {
    setOpen(false);
    setMethode(null);
    setReference(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : fermer())}>
      <DialogTrigger render={<Button size="sm" />}>
        <Smartphone />
        Payer
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Payer — {motif}</DialogTitle>
          <DialogDescription>{montant.toLocaleString("fr-FR")} FCFA · démonstration, aucun montant réel prélevé.</DialogDescription>
        </DialogHeader>

        {reference ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <p className="text-sm font-medium">Paiement confirmé</p>
            <p className="font-mono text-xs text-muted-foreground">Réf. {reference}</p>
          </div>
        ) : methode ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Smartphone className="size-10 animate-pulse text-primary" />
            <p className="text-sm font-medium">
              Compose <span className="font-mono">{USSD_CODES[methode]}</span> pour valider sur ton téléphone
            </p>
            <p className="text-xs text-muted-foreground">{enCours ? "En attente de confirmation…" : "Confirmé."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => payer("mtn")}>
              <span className="font-semibold text-amber-500">MTN</span>
              <span className="text-xs">Mobile Money</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => payer("orange")}>
              <span className="font-semibold text-orange-500">Orange</span>
              <span className="text-xs">Money</span>
            </Button>
          </div>
        )}

        {reference && (
          <DialogFooter>
            <Button variant="outline" onClick={fermer}>Fermer</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
