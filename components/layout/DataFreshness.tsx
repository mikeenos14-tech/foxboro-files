"use client";

import { useSyncExternalStore } from "react";

// "Stats last updated …", which turns into a warning when the stats are
// more than 36 hours old during the season — so nobody reads stale
// numbers without knowing. Worked out in the visitor's browser: most
// pages are built once at deploy time, so the server can't know how old
// they are when they're read.
const STALE_HOURS = 36;

function inSeason(now: Date): boolean {
  const m = now.getUTCMonth();
  return m >= 8 || m === 0 || (m === 1 && now.getUTCDate() <= 15);
}

const noSubscription = () => () => {};

export function DataFreshness({ asOf, label }: { asOf: string; label: string }) {
  // The server renders "not stale"; the browser works out the real answer
  // from the current time.
  const stale = useSyncExternalStore(
    noSubscription,
    () => {
      const now = new Date();
      return inSeason(now) && (now.getTime() - new Date(asOf).getTime()) / 3_600_000 > STALE_HOURS;
    },
    () => false
  );

  if (!stale) {
    return (
      <p className="mt-2">
        Stats last updated <time dateTime={asOf}>{label}</time>
      </p>
    );
  }
  return (
    <p role="status" className="mx-auto mt-3 max-w-md rounded-md border border-rank-mid/40 bg-rank-mid/10 px-3 py-2 text-rank-mid">
      Heads up: stats haven&apos;t updated since <time dateTime={asOf}>{label}</time>. The numbers here may be
      missing the latest game.
    </p>
  );
}
