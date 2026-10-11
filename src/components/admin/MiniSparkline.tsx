type Point = { date: string; signups: number; workouts: number };
type Series = "signups" | "workouts";

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function Bars({ points, series, label, color }: { points: Point[]; series: Series; label: string; color: string }) {
  const max = Math.max(1, ...points.map(point => point[series]));
  return <div className="grid grid-cols-[84px_minmax(0,1fr)] items-end gap-3">
    <p className="m-0 pb-1 text-xs font-medium text-[#68788b]">{label}</p>
    <div className="flex h-14 items-end gap-1" role="list" aria-label={`${label}, last 14 days`}>
      {points.map(point => {
        const value = point[series];
        const height = value === 0 ? 3 : Math.max(8, Math.round(value / max * 52));
        const date = dayLabel(point.date);
        return <span key={point.date} role="listitem" title={`${date}: ${value} ${series === "signups" ? "new users" : "workouts"}`} aria-label={`${date}: ${value} ${series === "signups" ? "new users" : "workouts"}`} className={`${color} min-w-0 flex-1 rounded-sm transition-colors hover:bg-blue-400`} style={{ height }} />;
      })}
    </div>
  </div>;
}

export function MiniSparkline({ points }: { points: Point[] }) {
  return <section className="admin-panel rounded-xl border border-[#e2e8ef] bg-white p-5 sm:p-6" aria-labelledby="admin-activity-trends">
    <div className="mb-5 flex items-baseline justify-between gap-3"><h2 id="admin-activity-trends" className="!m-0 !text-[14px] !font-semibold text-[#172638]">Last 14 days</h2><span className="text-[11px] text-[#8795a4]">Daily activity</span></div>
    <div className="grid gap-4"><Bars points={points} series="signups" label="Signups" color="bg-blue-500"/><Bars points={points} series="workouts" label="Workouts" color="bg-teal-600"/></div>
    {points.length > 0 && <div className="ml-[96px] mt-2 flex justify-between text-[10px] text-[#9aa6b2]"><time dateTime={points[0].date}>{dayLabel(points[0].date)}</time><time dateTime={points.at(-1)?.date}>{dayLabel(points.at(-1)!.date)}</time></div>}
  </section>;
}
