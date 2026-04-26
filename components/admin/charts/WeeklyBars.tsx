"use client";

interface DayData {
  label: string;
  count: number;
  resolved: number;
}

interface Props {
  data: DayData[];
}

export default function WeeklyBars({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-16 w-full">
      {data.map((d, i) => {
        const heightPct   = (d.count / max) * 100;
        const resolvedPct = d.count > 0 ? (d.resolved / d.count) * 100 : 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full relative rounded-t-md overflow-hidden"
              style={{ height: `${Math.max(heightPct, 8)}%`, minHeight: 4 }}
              title={`${d.label} : ${d.count} demandes, ${d.resolved} résolues`}
            >
              {/* Fond total */}
              <div className="absolute inset-0 bg-blue-100" />
              {/* Part résolue */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-emerald-400 transition-all duration-700"
                style={{ height: `${resolvedPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
