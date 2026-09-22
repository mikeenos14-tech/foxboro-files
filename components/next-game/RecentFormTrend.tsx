import type { OpponentMatchupData } from "@/lib/data/types";
import { signed } from "@/lib/util/format";

// Same rule as the site's recent-form filter (scripts/lib/statWindows.ts):
// a window is only worth showing once it covers fewer games than the
// season does. Through two games "Last 3", "Last 5" and "Season" are
// the same number three times, which looks like a bug rather than like
// an opponent who has played twice.
export function RecentFormTrend({
  recentForm,
}: {
  recentForm: OpponentMatchupData["recentForm"];
}) {
  const played = recentForm.gamesPlayed;
  const columns = [
    { label: "Last 3", value: recentForm.last3EpaPerPlay, show: played > 3 },
    { label: "Last 5", value: recentForm.last5EpaPerPlay, show: played > 5 },
    { label: "Season", value: recentForm.seasonEpaPerPlay, show: true },
  ].filter((c) => c.show);

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Opponent Recent Form (EPA/play)</h3>
      <div
        className="mt-3 grid gap-3 text-center"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((c) => (
          <div key={c.label}>
            <div className="text-xl font-bold text-foreground">{signed(c.value)}</div>
            <div className="text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>
      {columns.length === 1 && (
        <div className="mt-2 text-[11px] text-muted">
          {played} game{played === 1 ? "" : "s"} played — recent-form splits appear once
          they differ from the season.
        </div>
      )}
    </div>
  );
}
