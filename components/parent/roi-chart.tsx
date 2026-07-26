/**
 * components/parent/roi-chart.tsx
 *
 * Graphique combiné : barres = dépense cumulée (FCFA, échelle implicite
 * gauche), ligne = moyenne des notes par mois toutes matières confondues
 * (/20, échelle implicite droite). Même langage visuel que
 * components/shared/mini-line-chart.tsx (SVG pur, variables CSS du thème,
 * accessible), pour rester cohérent avec le reste de l'app.
 *
 * Ne fait aucun accès store — reçoit une série déjà construite par
 * lib/roi.ts (construireSeriesROI).
 */

import type { PointROI } from "@/lib/roi";

const WIDTH = 320;
const HEIGHT = 130;
const PADDING = 10;
const BAR_GAP = 4;

export function RoiChart({ data }: { data: PointROI[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">Pas encore assez de données pour ce suivi.</p>;
  }

  const usableWidth = WIDTH - PADDING * 2;
  const usableHeight = HEIGHT - PADDING * 2;
  const n = data.length;
  const barWidth = Math.max(4, usableWidth / n - BAR_GAP);

  const maxDepense = Math.max(...data.map((d) => d.depenseCumulee), 1);
  const xFor = (i: number) => PADDING + (i + 0.5) * (usableWidth / n);
  const yBar = (v: number) => PADDING + usableHeight - (v / maxDepense) * usableHeight;
  const yLigne = (v: number) => PADDING + usableHeight - (v / 20) * usableHeight;

  const pointsAvecNote = data
    .map((d, i) => ({ ...d, i }))
    .filter((d): d is typeof d & { moyenneMois: number } => d.moyenneMois !== null);
  const linePoints = pointsAvecNote.map((d) => ({ x: xFor(d.i), y: yLigne(d.moyenneMois) }));
  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const premiereNote = pointsAvecNote[0]?.moyenneMois ?? null;
  const derniereNote = pointsAvecNote[pointsAvecNote.length - 1]?.moyenneMois ?? null;
  const delta = premiereNote !== null && derniereNote !== null ? derniereNote - premiereNote : null;
  const totalInvesti = data[data.length - 1]?.depenseCumulee ?? 0;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-32 w-full"
        role="img"
        aria-label={`Investissement cumulé et moyenne par mois : ${data
          .map(
            (d) =>
              `${d.mois} — ${d.depenseCumulee.toLocaleString("fr-FR")} FCFA cumulés${
                d.moyenneMois !== null ? `, moyenne ${d.moyenneMois}/20` : ""
              }`
          )
          .join("; ")}`}
      >
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="var(--border)" strokeWidth={1} />

        {data.map((d, i) => {
          const x = xFor(i) - barWidth / 2;
          const y = yBar(d.depenseCumulee);
          return (
            <rect key={d.cle} x={x} y={y} width={barWidth} height={HEIGHT - PADDING - y} fill="var(--muted)" rx={2}>
              <title>{`${d.mois} : ${d.depenseCumulee.toLocaleString("fr-FR")} FCFA investis au total`}</title>
            </rect>
          );
        })}

        {linePoints.length > 1 && (
          <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pointsAvecNote.map((d, i) => (
          <circle key={d.cle} cx={linePoints[i].x} cy={linePoints[i].y} r={3} fill="var(--primary)" stroke="var(--card)" strokeWidth={1.5}>
            <title>{`${d.mois} : moyenne ${d.moyenneMois}/20`}</title>
          </circle>
        ))}

        {data.map((d, i) => (
          <text key={d.cle} x={xFor(i)} y={HEIGHT - 1} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>
            {d.mois}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-muted" /> {totalInvesti.toLocaleString("fr-FR")} FCFA investis au total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Moyenne
          {delta !== null && (
            <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
              {" "}
              ({delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} pt)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
