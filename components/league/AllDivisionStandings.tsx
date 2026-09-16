import type { LeagueDivisionGroup } from "@/lib/data/types";
import { DivisionStandings } from "@/components/home/DivisionStandings";

export function AllDivisionStandings({ groups }: { groups: LeagueDivisionGroup[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <DivisionStandings key={g.division} standings={g.standings} title={g.division} />
      ))}
    </div>
  );
}
