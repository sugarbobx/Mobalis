"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, CalendarRange, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { createClient } from "@/utils/supabase/client";
import { ANNEE_SCOLAIRE } from "@/lib/mock";
import type { Serie } from "@/lib/mock";

const SERIES: Serie[] = ["A", "C", "D", "SES"];

interface Centre {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
}
interface SequenceRow {
  id: string;
  libelle: string;
  ordre: number;
  date_debut: string | null;
  date_fin: string | null;
  annee_scolaire: string;
}

export default function AdminParametresPage() {
  const { matieres } = useStore();
  const [centre, setCentre] = useState<Centre | null>(null);
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [coefficients, setCoefficients] = useState<Map<string, number>>(new Map());
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const supabase = createClient();
    const [{ data: centreData }, { data: seqData }, { data: coefData }] = await Promise.all([
      supabase.from("centres").select("id, nom, adresse, telephone").limit(1).single(),
      supabase.from("sequences").select("id, libelle, ordre, date_debut, date_fin, annee_scolaire").order("ordre"),
      supabase.from("matiere_coefficients").select("matiere_id, serie, coefficient"),
    ]);
    setCentre(centreData ?? null);
    setSequences(seqData ?? []);
    setCoefficients(new Map((coefData ?? []).map((c) => [`${c.matiere_id}|${c.serie}`, c.coefficient])));
    setChargement(false);
  }

  useEffect(() => {
    void charger();
  }, []);

  if (chargement) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Établissement, séquences et coefficients — utilisés pour les bulletins.</p>
      </div>

      {centre && <EtablissementCard centre={centre} onUpdate={charger} />}
      <SequencesCard sequences={sequences} onCreate={charger} />
      <CoefficientsCard matieres={matieres} coefficients={coefficients} onChange={charger} />
    </div>
  );
}

function EtablissementCard({ centre, onUpdate }: { centre: Centre; onUpdate: () => void }) {
  const [adresse, setAdresse] = useState(centre.adresse ?? "");
  const [telephone, setTelephone] = useState(centre.telephone ?? "");
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    setEnvoi(true);
    const supabase = createClient();
    const { error } = await supabase.from("centres").update({ adresse, telephone }).eq("id", centre.id);
    setEnvoi(false);
    if (error) {
      toast.error(`Échec de l'enregistrement : ${error.message}`);
      return;
    }
    toast.success("Établissement mis à jour");
    onUpdate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> Établissement</CardTitle>
        <CardDescription>{centre.nom} — figure sur les bulletins générés.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-64" placeholder="Ex. Akwa, Douala" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone / Contact</Label>
          <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-48" placeholder="Ex. 6XX XX XX XX" />
        </div>
        <Button onClick={enregistrer} disabled={envoi}>{envoi ? "Enregistrement..." : "Enregistrer"}</Button>
      </CardContent>
    </Card>
  );
}

function SequencesCard({ sequences, onCreate }: { sequences: SequenceRow[]; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [ordre, setOrdre] = useState(String(sequences.length + 1));
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const formValide = libelle.trim().length > 0 && Number(ordre) > 0;

  async function creer() {
    if (!formValide) return;
    setEnvoi(true);
    const supabase = createClient();
    const { error } = await supabase.from("sequences").insert({
      libelle: libelle.trim(),
      ordre: Number(ordre),
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      annee_scolaire: ANNEE_SCOLAIRE,
    });
    setEnvoi(false);
    if (error) {
      toast.error(`Échec de création : ${error.message}`);
      return;
    }
    toast.success(`Séquence « ${libelle.trim()} » créée`);
    setOpen(false);
    setLibelle("");
    setOrdre(String(sequences.length + 2));
    onCreate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarRange className="size-4" /> Séquences</CardTitle>
          <CardDescription>Année scolaire {ANNEE_SCOLAIRE} — chaque bulletin correspond à une séquence.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus /> Nouvelle séquence
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nouvelle séquence</DialogTitle>
              <DialogDescription>Année scolaire {ANNEE_SCOLAIRE}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="libelle-seq">Libellé</Label>
                <Input id="libelle-seq" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex. Séquence 2" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ordre-seq">Ordre</Label>
                  <Input id="ordre-seq" type="number" min={1} value={ordre} onChange={(e) => setOrdre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="debut-seq">Début</Label>
                  <Input id="debut-seq" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fin-seq">Fin</Label>
                  <Input id="fin-seq" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={creer} disabled={!formValide || envoi}>{envoi ? "Création..." : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sequences.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Aucune séquence" hint="Crée la première séquence de l'année pour pouvoir générer des bulletins." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Ordre</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.libelle}</TableCell>
                  <TableCell>{s.ordre}</TableCell>
                  <TableCell className="text-muted-foreground">{s.date_debut ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.date_fin ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CoefficientsCard({
  matieres,
  coefficients,
  onChange,
}: {
  matieres: { id: string; nom: string }[];
  coefficients: Map<string, number>;
  onChange: () => void;
}) {
  const [valeurs, setValeurs] = useState(coefficients);
  useEffect(() => setValeurs(coefficients), [coefficients]);

  async function sauvegarder(matiereId: string, serie: Serie, valeur: string) {
    const coefficient = Number(valeur);
    if (Number.isNaN(coefficient) || coefficient <= 0) return;
    const cle = `${matiereId}|${serie}`;
    setValeurs((prev) => new Map(prev).set(cle, coefficient));
    const supabase = createClient();
    const { error } = await supabase.from("matiere_coefficients").upsert(
      { matiere_id: matiereId, serie, coefficient },
      { onConflict: "matiere_id,serie" }
    );
    if (error) toast.error(`Échec de la sauvegarde : ${error.message}`);
    else onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coefficients</CardTitle>
        <CardDescription>Par matière et par série — utilisés pour la moyenne pondérée des bulletins (1 par défaut).</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matière</TableHead>
              {SERIES.map((s) => <TableHead key={s} className="text-center">{s}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matieres.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nom}</TableCell>
                {SERIES.map((s) => (
                  <TableCell key={s} className="text-center">
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      defaultValue={valeurs.get(`${m.id}|${s}`) ?? 1}
                      onBlur={(e) => sauvegarder(m.id, s, e.target.value)}
                      className="mx-auto h-8 w-16 text-center"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
