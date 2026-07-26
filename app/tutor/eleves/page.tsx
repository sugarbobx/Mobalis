"use client";

import { HeatmapMaitrise } from "@/components/tutor/heatmap-maitrise";

export default function TutorElevesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mes élèves</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de la maîtrise de tes élèves, matière par matière.
        </p>
      </div>

      <HeatmapMaitrise />
    </div>
  );
}
