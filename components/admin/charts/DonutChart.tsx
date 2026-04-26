"use client";

interface Slice {
  value: number;
  color: string;
  label: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

export default function DonutChart({
  slices,
  size = 140,
  thickness = 22,
  centerLabel,
  centerSub,
}: Props) {
  const total = slices.reduce((s, c) => s + c.value, 0);
  if (total === 0) return null;

  const r   = (size - thickness) / 2;
  const cx  = size / 2;
  const cy  = size / 2;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />

      {slices.map((slice, i) => {
        if (slice.value === 0) return null;
        const pct    = slice.value / total;
        const dash   = pct * circ;
        const gap    = circ - dash;
        const offset = -(cumulative / total) * circ - circ / 4; // start at top
        cumulative  += slice.value;

        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
        );
      })}

      {/* Centre */}
      {centerLabel && (
        <>
          <text
            x={cx}
            y={cy - (centerSub ? 6 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={centerSub ? 22 : 20}
            fontWeight="800"
            fill="#0f172a"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {centerLabel}
          </text>
          {centerSub && (
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="#94a3b8"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {centerSub}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
