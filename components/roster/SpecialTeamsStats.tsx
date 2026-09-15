import type { TeamStatSnapshot } from "@/lib/data/types";
import { StatCard } from "@/components/shared/StatCard";
import { formatPercent } from "@/lib/util/format";

export function SpecialTeamsStats({
  specialTeams,
}: {
  specialTeams: TeamStatSnapshot["specialTeams"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Field Goal %"
        value={formatPercent(specialTeams.fieldGoalPct.value)}
        leagueRank={specialTeams.fieldGoalPct.leagueRank}
      />
      <StatCard
        label="Net Punting Avg"
        value={specialTeams.netPuntingAvg.value.toFixed(1)}
        leagueRank={specialTeams.netPuntingAvg.leagueRank}
      />
      <StatCard
        label="Kick Return Avg"
        value={specialTeams.kickReturnAvg.value.toFixed(1)}
        leagueRank={specialTeams.kickReturnAvg.leagueRank}
      />
      <StatCard
        label="Punt Return Avg"
        value={specialTeams.puntReturnAvg.value.toFixed(1)}
        leagueRank={specialTeams.puntReturnAvg.leagueRank}
      />
      <StatCard
        label="Special Teams EPA"
        value={specialTeams.specialTeamsEpa.value.toFixed(2)}
        leagueRank={specialTeams.specialTeamsEpa.leagueRank}
      />
    </div>
  );
}
