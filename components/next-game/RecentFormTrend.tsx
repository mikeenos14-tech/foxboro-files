import type { OpponentMatchupData } from "@/lib/data/types";
import { signed } from "@/lib/util/format";

// Net EPA/play — offense minus defense allowed — for both teams side by
// side. On its own, "+0.16" tells a reader nothing; against our own
// number in the same column it becomes the thing they actually came to
// find out, which is whether we're playing better than they are.
//
// Windows follow the same rule as the rest of the site (see
// scripts/lib/statWindows.ts): one only appears once it covers fewer
// games than the season does, so early in the year this is a single
// column rather than the same figure printed three times. The test is
// on the team with FEWER games, because a row where our "last 3" sits
// beside their whole season isn't a comparison.
export function RecentFormTrend({
  recentForm,
  opponent,
}: {
  recentForm: OpponentMatchupData["recentForm"];
  opponent: string;
}) {
  const { us, them } = recentForm;
  const bothPlayed = Math.min(us.gamesPlayed, them.gamesPlayed);

  const rows = [
    { label: "Last 3", ours: us.last3EpaPerPlay, theirs: them.last3EpaPerPlay, show: bothPlayed > 3 },
    { label: "Last 5", ours: us.last5EpaPerPlay, theirs: them.last5EpaPerPlay, show: bothPlayed > 5 },
    { label: "Season", ours: us.seasonEpaPerPlay, theirs: them.seasonEpaPerPlay, show: true },
  ].filter((r) => r.show);

  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="px-4 pt-4">
        <h3 className="font-semibold">Recent Form</h3>
        <p className="mt-0.5 text-[11px] text-muted">
          Net EPA/play — what a team gains on offense minus what it allows. Higher is better.
        </p>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
            <th className="px-4 py-2 text-left font-medium">Window</th>
            <th className="px-4 py-2 text-right font-medium">NE</th>
            <th className="px-4 py-2 text-right font-medium">{opponent}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            // Colour the side that's ahead rather than colouring by
            // positive/negative: the question here is which team has
            // been better, not whether either is above average.
            const weLead = r.ours > r.theirs;
            return (
              <tr key={r.label} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-muted">
                  {r.label}
                </th>
                <td
                  className={`px-4 py-2.5 text-right font-display font-semibold tabular-nums ${
                    weLead ? "text-rank-good" : "text-foreground"
                  }`}
                >
                  {signed(r.ours)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-display font-semibold tabular-nums ${
                    weLead ? "text-foreground" : "text-rank-good"
                  }`}
                >
                  {signed(r.theirs)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 1 && (
        <div className="px-4 pb-3 text-[11px] text-muted">
          Shorter windows appear once both teams have played enough games for them to
          differ from the season.
        </div>
      )}
    </div>
  );
}
