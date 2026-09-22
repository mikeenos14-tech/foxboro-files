import type { TeamStatSnapshot } from "@/lib/data/types";
import { StatCard } from "@/components/shared/StatCard";

// Real penalty counts/yards — a traditional stat with no presence on the
// site before this (see lib/pbp.ts's penaltyStats/mostPenalizedPlayer).
// Fewer penalties is better, same as every other "lower is better"
// RankedStat on the site — StatCard's rank coloring already handles that
// via leagueRank without any extra flag here.
export function DisciplineStats({ discipline }: { discipline: TeamStatSnapshot["discipline"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Penalties"
        value={String(discipline.penaltiesCommitted.value)}
        leagueRank={discipline.penaltiesCommitted.leagueRank}
      />
      <StatCard
        label="Penalty Yards"
        value={String(discipline.penaltyYardsCommitted.value)}
        leagueRank={discipline.penaltyYardsCommitted.leagueRank}
      />
      {discipline.mostPenalized && (
        <StatCard
          label="Most Penalized"
          value={`${discipline.mostPenalized.playerName} (${discipline.mostPenalized.count})`}
        />
      )}
    </div>
  );
}
