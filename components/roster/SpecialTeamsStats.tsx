import type { TeamStatSnapshot } from "@/lib/data/types";
import { StatListTable } from "@/components/shared/StatListTable";
import { formatPercent } from "@/lib/util/format";

export function SpecialTeamsStats({
  specialTeams,
}: {
  specialTeams: TeamStatSnapshot["specialTeams"];
}) {
  return (
    <StatListTable
      rows={[
        { label: "Field goal %", stat: specialTeams.fieldGoalPct, format: (v) => formatPercent(v) },
        { label: "Net punting avg", stat: specialTeams.netPuntingAvg, format: (v) => v.toFixed(1) },
        { label: "Kick return avg", stat: specialTeams.kickReturnAvg, format: (v) => v.toFixed(1) },
        { label: "Punt return avg", stat: specialTeams.puntReturnAvg, format: (v) => v.toFixed(1) },
        { label: "Special teams EPA", stat: specialTeams.specialTeamsEpa, format: (v) => v.toFixed(2) },
      ]}
    />
  );
}
