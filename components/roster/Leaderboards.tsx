"use client";

import { useState } from "react";
import type { PlayerStatLine, TeamLeaderboards } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";

// "Who leads us in receiving yards" had no answer anywhere on the site
// before this — everything was team-level except one QB page. Three
// boards rather than one combined table, because the stat columns that
// matter are completely different per side of the ball.
const BOARDS = [
  { key: "receiving", label: "Receiving" },
  { key: "rushing", label: "Rushing" },
  { key: "defense", label: "Defense" },
] as const;

type BoardKey = (typeof BOARDS)[number]["key"];

// NFL Next Gen Stats tracking, shown under qualifying players' names.
const NGS_NOTE: Partial<Record<BoardKey, string>> = {
  receiving:
    "Separation (NFL Next Gen Stats): average distance to the nearest defender when the ball arrives — how open a receiver gets, separate from how good the throw is.",
  rushing:
    "Over expected (NFL Next Gen Stats): yards per carry beyond what tracking data expected given the blocking and defenders — the part of a run that's the runner.",
};

export function Leaderboards({ leaders }: { leaders: TeamLeaderboards }) {
  const [board, setBoard] = useState<BoardKey>("receiving");
  const rows = leaders[board];

  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex gap-1 border-b border-border p-2" role="tablist">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            role="tab"
            aria-selected={board === b.key}
            onClick={() => setBoard(b.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              board === b.key
                ? "bg-red text-white"
                : "text-muted hover:bg-navy/10 hover:text-foreground"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted">No qualifying players yet this season.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 8).map((p, i) => (
            <LeaderRow key={p.playerId} player={p} rank={i + 1} />
          ))}
        </ul>
      )}
      {rows.slice(0, 8).some((p) => p.detail) && NGS_NOTE[board] && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">{NGS_NOTE[board]}</p>
      )}
    </div>
  );
}

// On a phone the stats drop to their own full-width line under the
// player: side by side, the receiving board's seven stat columns squeezed
// the name column to nothing and no player's name was visible.
function LeaderRow({ player, rank }: { player: PlayerStatLine; rank: number }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex-nowrap">
      <span className="w-4 shrink-0 text-xs tabular-nums text-muted">{rank}</span>
      <PlayerHeadshot name={player.playerName} imageUrl={player.headshotUrl} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {player.playerName} <span className="text-xs font-normal text-muted">{player.position}</span>
        </div>
        {player.detail && <div className="text-[11px] text-muted">{player.detail}</div>}
      </div>
      <div className="flex w-full justify-between gap-2 pl-7 text-right sm:w-auto sm:shrink-0 sm:justify-end sm:gap-4 sm:pl-0">
        {player.stats.map((s) => (
          <div key={s.label} className="min-w-0 sm:min-w-[2.5rem]">
            <div className="text-sm font-semibold tabular-nums text-foreground">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </li>
  );
}
