"use client";

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface Props {
  segments: Segment[];
  height?: number;
}

export default function StackedBar({ segments, height = 8 }: Props) {
  const total = segments.reduce((s, c) => s + c.value, 0);
  if (total === 0) return <div className="w-full bg-slate-100 rounded-full" style={{ height }} />;

  return (
    <div
      className="w-full flex rounded-full overflow-hidden gap-px"
      style={{ height }}
      title={segments.map((s) => `${s.label}: ${s.value}`).join(" · ")}
    >
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const pct = (seg.value / total) * 100;
        return (
          <div
            key={i}
            className="transition-all duration-700"
            style={{ width: `${pct}%`, background: seg.color, minWidth: pct > 0 ? 3 : 0 }}
          />
        );
      })}
    </div>
  );
}
