"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, GraduationCap, Users, BookOpen, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useStore } from "@/lib/store";

export default function AdminDashboardPage() {
  const { eleves, parents, matieres, repetiteurs, paiements, addPaiement, getMatieresActives, getEleve } = useStore();
  const matieresActives = getMatieresActives();
  const paiementsEnAttente = paiements.filter((p) => p.statut === "en_attente" || p.statut === "en_retard");
  const dernieresInscriptions = eleves.slice(0, 5);
  const derniersRepetiteurs = repetiteurs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble du centre MOBALIS.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Élèves inscrits" value={eleves.length} icon={GraduationCap} accent />
        <StatCard label="Répétiteurs actifs" value={repetiteurs.length} icon={Users} />
        <StatCard label="Matières actives" value={matieresActives.length} icon={BookOpen} hint={`sur ${matieres.length} au total`} />
        <StatCard
          label="Paiements à traiter"
          value={paiementsEnAttente.length}
          icon={CreditCard}
          hint="en attente ou en retard"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Dernières inscriptions</CardTitle>
            <Link href="/admin/eleves" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Voir tout <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {dernieresInscriptions.map((eleve) => (
              <div key={eleve.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{eleve.prenom} {eleve.nom}</span>
                <span className="text-muted-foreground">{eleve.classe} · {eleve.serie}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Répétiteurs</CardTitle>
            <Link href="/admin/repetiteurs" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Voir tout <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {derniersRepetiteurs.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{rep.prenom} {rep.nom}</span>
                <span className="text-muted-foreground">{rep.eleveIds.length} élève(s)</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Suivi global des paiements</CardTitle>
          <NouvelleFactureDialog eleves={eleves} onCreate={addPaiement} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((paiement) => {
                  const eleve = getEleve(paiement.eleveId);
                  const parent = parents.find((p) => p.id === paiement.parentId);
                  return (
                    <TableRow key={paiement.id}>
                      <TableCell className="font-medium">{eleve && `${eleve.prenom} ${eleve.nom}`}</TableCell>
                      <TableCell>{parent && `${parent.prenom} ${parent.nom}`}</TableCell>
                      <TableCell>{paiement.motif}</TableCell>
                      <TableCell>{paiement.montant.toLocaleString("fr-FR")} FCFA</TableCell>
                      <TableCell>{paiement.date}</TableCell>
                      <TableCell><StatusBadge status={paiement.statut} /></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NouvelleFactureDialog({
  eleves,
  onCreate,
}: {
  eleves: { id: string; nom: string; prenom: string; parentIds: string[] }[];
  onCreate: (paiement: {
    parentId: string;
    eleveId: string;
    montant: number;
    date: string;
    motif: string;
    statut: "paye" | "en_attente" | "en_retard";
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [motif, setMotif] = useState("");
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [envoi, setEnvoi] = useState(false);

  const eleve = eleves.find((e) => e.id === eleveId);
  const formValide = !!eleve && eleve.parentIds.length > 0 && motif.trim().length > 0 && Number(montant) > 0;

  async function creer() {
    if (!formValide || !eleve) return;
    setEnvoi(true);
    try {
      await onCreate({
        parentId: eleve.parentIds[0],
        eleveId: eleve.id,
        montant: Number(montant),
        date,
        motif: motif.trim(),
        statut: "en_attente",
      });
      toast.success(`Facture créée pour ${eleve.prenom} ${eleve.nom}`);
      setOpen(false);
      setMotif("");
      setMontant("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la création de la facture");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Nouvelle facture
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>Créée en attente — le parent la règle depuis son espace (MTN/Orange Money).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Élève</Label>
            <Select
              items={Object.fromEntries(eleves.map((e) => [e.id, `${e.prenom} ${e.nom}`]))}
              value={eleveId}
              onValueChange={(v) => v && setEleveId(v)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>
                {eleves.map((e) => <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motif-facture">Motif</Label>
            <Input id="motif-facture" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Forfait mensuel - Août" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="montant-facture">Montant (FCFA)</Label>
              <Input id="montant-facture" type="number" min={0} value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-facture">Date</Label>
              <Input id="date-facture" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={creer} disabled={!formValide || envoi}>
            {envoi ? "Création..." : "Créer la facture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
