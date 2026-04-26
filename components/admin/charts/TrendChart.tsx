"use client";

interface Props {
  data: number[];
  labels: string[];
  color?: string;
  showAverage?: boolean;
}

export default function TrendChart({ data, labels, color = "#1e3a8a", showAverage = true }: Props) {
  const W = 800;
  const H = 110;
  const PAD = { top: 14, right: 12, bottom: 28, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data, 1);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / max) * chartH;

  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v), v }));

  function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = ((prev.x + curr.x) / 2).toFixed(1);
      d += ` C ${cpx} ${prev.y.toFixed(1)}, ${cpx} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${PAD.left} ${PAD.top + chartH} Z`;
  const avgY = toY(avg);

  const xLabels = [0, 6, 13, 20, 27, data.length - 1];
  const yMax = max;
  const yMid = Math.round(max / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 120 }}>
      {/* Grille horizontale */}
      {[0, yMid, yMax].map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.left - 5} y={y} textAnchor="end" dominantBaseline="middle"
              fontSize={9} fill="#94a3b8" fontFamily="Inter, system-ui, sans-serif">
              {tick}
            </text>
          </g>
        );
      })}

      {/* Ligne moyenne */}
      {showAverage && (
        <>
          <line x1={PAD.left} y1={avgY} x2={PAD.left + chartW} y2={avgY}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />
          <text x={PAD.left + chartW + 4} y={avgY} dominantBaseline="middle"
            fontSize={8.5} fill="#94a3b8" fontFamily="Inter, system-ui, sans-serif">
            moy.
          </text>
        </>
      )}

      {/* Aire */}
      <path d={areaPath} fill={color} opacity={0.07} />

      {/* Ligne principale */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Labels X */}
      {xLabels.map((i) => labels[i] && (
        <text key={i} x={pts[i].x} y={H - 5}
          textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
          fontSize={9} fill="#94a3b8" fontFamily="Inter, system-ui, sans-serif">
          {labels[i]}
        </text>
      ))}
    </svg>
  );
}
