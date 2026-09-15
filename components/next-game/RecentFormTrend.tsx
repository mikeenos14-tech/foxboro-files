import type { OpponentMatchupData } from "@/lib/data/types";
import { signed } from "@/lib/util/format";

export function RecentFormTrend({
  recentForm,
}: {
  recentForm: OpponentMatchupData["recentForm"];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Opponent Recent Form (EPA/play)</h3>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xl font-bold text-navy">
            {signed(recentForm.last3EpaPerPlay)}
          </div>
          <div className="text-xs text-muted">Last 3</div>
        </div>
        <div>
          <div className="text-xl font-bold text-navy">
            {signed(recentForm.last5EpaPerPlay)}
          </div>
          <div className="text-xs text-muted">Last 5</div>
        </div>
        <div>
          <div className="text-xl font-bold text-navy">
            {signed(recentForm.seasonEpaPerPlay)}
          </div>
          <div className="text-xs text-muted">Season</div>
        </div>
      </div>
    </div>
  );
}
