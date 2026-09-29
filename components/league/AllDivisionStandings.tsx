import type { LeagueDivisionGroup } from "@/lib/data/types";
import { DivisionStandings } from "@/components/home/DivisionStandings";
import { Legend } from "@/components/shared/Legend";
import { Tabs } from "@/components/shared/Tabs";

// One conference at a time: all eight divisions stacked ran to nearly
// three phone screens, and Home already shows the AFC East.
export function AllDivisionStandings({ groups }: { groups: LeagueDivisionGroup[] }) {
  const conference = (c: "AFC" | "NFC") => (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups
        .filter((g) => g.division.startsWith(c))
        .map((g) => (
          <DivisionStandings key={g.division} standings={g.standings} title={g.division} showLegend={false} />
        ))}
    </div>
  );
  return (
    <div>
      {/* One shared legend instead of repeating it on every card below. */}
      <Legend
        className="mb-3 rounded-lg border border-border bg-surface"
        items={[
          { term: "Div", definition: "division record" },
          { term: "Strk", definition: "current streak" },
          { term: "+/−", definition: "point differential" },
        ]}
      />
      <Tabs
        tabs={[
          { label: "AFC", content: conference("AFC") },
          { label: "NFC", content: conference("NFC") },
        ]}
      />
    </div>
  );
}
