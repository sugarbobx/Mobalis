"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { useStore } from "@/lib/store";
import type { Serie } from "@/lib/mock";

const PALETTE = ["#0066FF", "#3385FF", "#66A3FF", "#8FBBFF", "#5C7CFA", "#4C6EF5"];
const SERIES: Serie[] = ["A", "C", "D", "SES"];

export default function AdminSubjectsPage() {
  const { matieres, toggleMatiereStatut, addMatiere } = useStore();
  const [nouvelleMatiere, setNouvelleMatiere] = useState("");
  const [seriesChoisies, setSeriesChoisies] = useState<Serie[]>([]);

  function toggleSerie(serie: Serie) {
    setSeriesChoisies((prev) => (prev.includes(serie) ? prev.filter((s) => s !== serie) : [...prev, serie]));
  }

  async function ajouterMatiere() {
    const nom = nouvelleMatiere.trim();
    if (!nom || seriesChoisies.length === 0) return;
    try {
      await addMatiere({
        nom,
        statut: "actif",
        couleur: PALETTE[matieres.length % PALETTE.length],
        series: seriesChoisies,
      });
      setNouvelleMatiere("");
      setSeriesChoisies([]);
      toast.success(`Matière « ${nom} » créée et activée`);
    } catch {
      toast.error("Échec de la création de la matière");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gestion des matières</h1>
        <p className="text-sm text-muted-foreground">
          Portée globale pour tout le centre — activer ou désactiver une matière la rend disponible
          (ou non) pour tous les répétiteurs et élèves.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer une matière</CardTitle>
          <CardDescription>La nouvelle matière est activée par défaut.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="nom-matiere">Nom de la matière</Label>
              <Input
                id="nom-matiere"
                placeholder="Ex. Philosophie"
                value={nouvelleMatiere}
                onChange={(e) => setNouvelleMatiere(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ajouterMatiere()}
              />
            </div>
            <Button onClick={ajouterMatiere} disabled={!nouvelleMatiere.trim() || seriesChoisies.length === 0}>
              <Plus />
              Ajouter
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Séries concernées</Label>
            <div className="flex flex-wrap gap-3">
              {SERIES.map((serie) => (
                <label key={serie} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Checkbox checked={seriesChoisies.includes(serie)} onCheckedChange={() => toggleSerie(serie)} />
                  Série {serie}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matières du centre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {matieres.map((matiere) => (
            <div
              key={matiere.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: matiere.couleur }}
                />
                <span className="font-medium">{matiere.nom}</span>
                <StatusBadge status={matiere.statut} />
                <div className="flex gap-1">
                  {matiere.series.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {matiere.statut === "actif" ? "Activée" : "Désactivée"}
                </span>
                <Switch
                  checked={matiere.statut === "actif"}
                  onCheckedChange={() => {
                    toggleMatiereStatut(matiere.id);
                    toast.info(
                      matiere.statut === "actif"
                        ? `« ${matiere.nom} » désactivée pour tout le centre`
                        : `« ${matiere.nom} » activée pour tout le centre`
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
