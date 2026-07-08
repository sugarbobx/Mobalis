const WIDTH = 240;
const HEIGHT = 64;
const PADDING = 8;

export function MiniLineChart({
  data,
  max = 20,
  unit = "/20",
}: {
  data: { label: string; value: number }[];
  max?: number;
  unit?: string;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">Pas encore de données.</p>;
  }

  const min = 0;
  const usableWidth = WIDTH - PADDING * 2;
  const usableHeight = HEIGHT - PADDING * 2;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? PADDING : PADDING + (i / (data.length - 1)) * usableWidth;
    const ratio = (d.value - min) / (max - min);
    const y = PADDING + usableHeight - ratio * usableHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${HEIGHT - PADDING} L${points[0].x.toFixed(1)},${HEIGHT - PADDING} Z`;

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const delta = last - first;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-16 w-full max-w-60"
        role="img"
        aria-label={`Évolution : ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}
      >
        <defs>
          <linearGradient id="mini-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="var(--border)" strokeWidth={1} />
        <path d={areaPath} fill="url(#mini-chart-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <circle key={i} cx={p.x} cy={p.y} r={isLast ? 3.5 : 2.5} fill={isLast ? "var(--primary)" : "var(--background)"} stroke="var(--primary)" strokeWidth={1.5}>
              <title>{`${p.label} : ${p.value}${unit}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-lg font-semibold">{last}{unit}</span>
        <span className={`text-xs ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)} depuis le début
        </span>
      </div>
    </div>
  );
}
