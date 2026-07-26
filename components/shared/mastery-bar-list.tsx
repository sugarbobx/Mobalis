/**
 * components/shared/mastery-bar-list.tsx
 *
 * Repli du MasteryRadarChart au-delà de MAX_AXES_RADAR matières (voir
 * mastery-radar-chart.tsx) : une liste à barres, triée par maîtrise
 * croissante (la matière la plus faible en premier — la plus actionnable),
 * sans limite de nombre d'axes contrairement au radar.
 */

import type { RadarAxis } from "./mastery-radar-chart";

export function MasteryBarList({ data }: { data: RadarAxis[] }) {
  const trie = [...data].sort((a, b) => a.value - b.value);

  return (
    <div
      className="space-y-2.5"
      role="img"
      aria-label={`Maîtrise par matière : ${data.map((d) => `${d.label} ${d.value}%`).join(", ")}`}
    >
      {trie.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.color ?? "var(--primary)" }} />
              {d.label}
            </span>
            <span className="text-muted-foreground">{d.value}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, d.value))}%`, background: d.color ?? "var(--primary)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
