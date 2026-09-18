import type { LeagueDivisionGroup } from "@/lib/data/types";
import { DivisionStandings } from "@/components/home/DivisionStandings";
import { Legend } from "@/components/shared/Legend";

export function AllDivisionStandings({ groups }: { groups: LeagueDivisionGroup[] }) {
  return (
    <div>
      {/* One shared legend instead of repeating it on all 8 cards below. */}
      <Legend
        className="mb-3 rounded-lg border border-border bg-surface"
        items={[
          { term: "Div", definition: "division record" },
          { term: "Strk", definition: "current streak" },
          { term: "+/−", definition: "point differential" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <DivisionStandings
            key={g.division}
            standings={g.standings}
            title={g.division}
            showLegend={false}
          />
        ))}
      </div>
    </div>
  );
}
