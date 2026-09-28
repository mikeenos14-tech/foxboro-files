"use client";

import { useState } from "react";
import type { LeaderPlays, PlayerStatLine, TeamLeaderboards } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { PlaysDialog } from "@/components/plays/PlaysDialog";

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
  // Tapping a player opens every play behind his line. The play data is
  // fetched on first tap, not shipped with the page (see
  // app/api/plays/leaders/route.ts).
  const [selected, setSelected] = useState<{ key: string; name: string } | null>(null);
  const [plays, setPlays] = useState<LeaderPlays | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const open = (player: PlayerStatLine) => {
    setSelected({ key: `${board}:${player.playerId}`, name: player.playerName });
    if (!plays) {
      fetch("/api/plays/leaders")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(setPlays)
        .catch(() => setLoadFailed(true));
    }
  };
  const group = selected && plays ? plays.byPlayer[selected.key] : null;

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
            <LeaderRow key={p.playerId} player={p} rank={i + 1} onOpen={() => open(p)} />
          ))}
        </ul>
      )}
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
        Tap a player to see every play behind his numbers.
      </p>
      <PlaysDialog
        title={selected ? `${selected.name}'s plays` : ""}
        groups={loadFailed ? [] : group ? [group] : null}
        plays={loadFailed ? {} : plays?.plays ?? null}
        open={selected !== null}
        onClose={() => setSelected(null)}
        showWeek
      />
      {rows.slice(0, 8).some((p) => p.detail) && NGS_NOTE[board] && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">{NGS_NOTE[board]}</p>
      )}
    </div>
  );
}

// On a phone the stats drop to their own full-width line under the
// player: side by side, the receiving board's seven stat columns squeezed
// the name column to nothing and no player's name was visible.
function LeaderRow({ player, rank, onOpen }: { player: PlayerStatLine; rank: number; onOpen: () => void }) {
  return (
    <li>
      <button
        onClick={onOpen}
        aria-label={`${player.playerName}: see his plays`}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-left transition-colors hover:bg-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red sm:flex-nowrap"
      >
        <span className="w-4 shrink-0 text-xs tabular-nums text-muted">{rank}</span>
        <PlayerHeadshot name={player.playerName} imageUrl={player.headshotUrl} size={32} />
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {player.playerName} <span className="text-xs font-normal text-muted">{player.position}</span>
          </span>
          {player.detail && <span className="block text-[11px] text-muted">{player.detail}</span>}
        </span>
        <span className="flex w-full justify-between gap-2 pl-7 text-right sm:w-auto sm:shrink-0 sm:justify-end sm:gap-4 sm:pl-0">
          {player.stats.map((s) => (
            <span key={s.label} className="block min-w-0 sm:min-w-[2.5rem]">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
              <span className="block text-[10px] uppercase tracking-wide text-muted">{s.label}</span>
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}
