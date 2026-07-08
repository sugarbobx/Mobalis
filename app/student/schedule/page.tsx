"use client";

import { MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getRepetiteur, CURRENT_STUDENT_ID } from "@/lib/mock";
import { useStore } from "@/lib/store";

function formatJour(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function StudentSchedulePage() {
  const { getSeancesByEleve, getMatiere } = useStore();
  const seances = getSeancesByEleve(CURRENT_STUDENT_ID);
  const parDate = new Map<string, typeof seances>();
  for (const s of seances) {
    parDate.set(s.date, [...(parDate.get(s.date) ?? []), s]);
  }
  const dates = Array.from(parDate.keys()).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Emploi du temps</h1>
        <p className="text-sm text-muted-foreground">Toutes tes séances, passées et à venir.</p>
      </div>

      <div className="space-y-4">
        {dates.map((date) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatJour(date)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {parDate.get(date)!.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{getMatiere(s.matiereId)?.nom}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5" /> {s.heureDebut} - {s.heureFin}
                      <span className="mx-1">·</span>
                      <MapPin className="size-3.5" /> {s.lieu}
                    </span>
                    <span className="text-muted-foreground">
                      Avec {getRepetiteur(s.repetiteurId)?.prenom} {getRepetiteur(s.repetiteurId)?.nom}
                    </span>
                  </div>
                  <StatusBadge status={s.statut} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
