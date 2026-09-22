import type { TeamStatSnapshot } from "@/lib/data/types";
import { StatListTable } from "@/components/shared/StatListTable";

// Fewer penalties is better, which StatListTable's rank colouring already
// reflects — leagueRank is computed with that direction baked in, so rank
// 1 means fewest (see rankGeneric).
export function DisciplineStats({ discipline }: { discipline: TeamStatSnapshot["discipline"] }) {
  return (
    <StatListTable
      rows={[
        {
          label: "Penalties",
          stat: discipline.penaltiesCommitted,
          format: (v) => String(v),
          note: discipline.mostPenalized
            ? `most: ${discipline.mostPenalized.playerName} (${discipline.mostPenalized.count})`
            : undefined,
        },
        {
          label: "Penalty yards",
          stat: discipline.penaltyYardsCommitted,
          format: (v) => String(v),
        },
      ]}
    />
  );
}
