import type { DepthChartEntry } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";

const UNITS = ["Offense", "Defense", "Special Teams"] as const;

export function DepthChartTable({ chart }: { chart: DepthChartEntry[] }) {
  if (chart.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        The depth chart isn&apos;t available right now.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {UNITS.map((unit) => {
        const entries = chart.filter((e) => (e.unit ?? "Offense") === unit);
        if (entries.length === 0) return null;
        return (
          <section key={unit}>
            <h3 className="mb-2 font-display text-lg font-semibold uppercase tracking-wide text-foreground">
              {unit}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <div
                  key={`${unit}-${entry.position}`}
                  className="lift rounded-lg border border-border bg-surface p-4"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    {entry.position}
                  </span>
                  <ul className="mt-2 space-y-2">
                    {entry.players.map((p) => (
                      <li key={p.playerId} className="flex items-center gap-2">
                        <PlayerHeadshot name={p.playerName} imageUrl={p.headshotUrl} size={32} />
                        <span className={`text-sm ${p.rank === 1 ? "font-semibold" : "text-muted"}`}>
                          {p.rank}. {p.playerName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p className="text-xs text-muted">Source: the team&apos;s depth chart as published by ESPN.</p>
    </div>
  );
}
