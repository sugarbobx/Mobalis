/**
 * components/shared/mastery-radar-chart.tsx
 *
 * Radar (spider chart) générique — même logique de style que
 * components/shared/mini-line-chart.tsx : SVG pur, couleurs via
 * variables CSS du thème (respecte le dark mode automatiquement),
 * accessible (role="img" + aria-label résumant les données).
 *
 * Usage typique : agréger MaitriseChapitre (lib/revision.ts) par matière
 * pour obtenir un axe par matière plutôt qu'un axe par chapitre.
 *
 * Au-delà de MAX_AXES_RADAR matières (séries SES : tronc commun + jusqu'à
 * 4 matières supplémentaires, voir 0015_matieres_ses.sql), les labels se
 * chevauchent et le radar devient illisible — utiliser MasteryBarList
 * (mastery-bar-list.tsx) comme repli au-delà de ce seuil.
 */

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 74;
const RINGS = [0.25, 0.5, 0.75, 1] as const;

/** Seuil au-delà duquel le radar devient illisible — voir MasteryBarList. */
export const MAX_AXES_RADAR = 7;

export interface RadarAxis {
  label: string;
  /** 0-100 */
  value: number;
  /** Couleur d'accent du point (ex. Matiere.couleur). Défaut : var(--primary). */
  color?: string;
}

function pointsForRatio(n: number, ratio: number): string {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = CENTER + Math.cos(angle) * RADIUS * ratio;
    const y = CENTER + Math.sin(angle) * RADIUS * ratio;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function MasteryRadarChart({ data }: { data: RadarAxis[] }) {
  const n = data.length;

  if (n < 3) {
    return (
      <p className="text-xs text-muted-foreground">
        Pas encore assez de matières suivies pour afficher le radar (minimum 3).
      </p>
    );
  }

  const valuePoints = data.map((d, i) => {
    const ratio = Math.max(0, Math.min(100, d.value)) / 100;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: CENTER + Math.cos(angle) * RADIUS * ratio,
      y: CENTER + Math.sin(angle) * RADIUS * ratio,
      ...d,
    };
  });
  const valuePath = valuePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto h-56 w-full max-w-64"
      role="img"
      aria-label={`Maîtrise par matière : ${data.map((d) => `${d.label} ${d.value}%`).join(", ")}`}
    >
      {RINGS.map((r) => (
        <polygon key={r} points={pointsForRatio(n, r)} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}

      {data.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = CENTER + Math.cos(angle) * RADIUS;
        const y = CENTER + Math.sin(angle) * RADIUS;
        return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}

      <polygon
        points={valuePath}
        fill="var(--primary)"
        fillOpacity={0.18}
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {valuePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={p.color ?? "var(--primary)"} stroke="var(--background)" strokeWidth={1.5}>
          <title>{`${p.label} : ${p.value}%`}</title>
        </circle>
      ))}

      {data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = CENTER + Math.cos(angle) * (RADIUS + 22);
        const ly = CENTER + Math.sin(angle) * (RADIUS + 22);
        const cos = Math.cos(angle);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
