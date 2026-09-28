// ESPN's official standings order, used only to break ties.
//
// The site doesn't compute NFL tiebreakers itself (head-to-head, division
// record, common games, …) — a deliberate choice. It used to fall back to
// point differential instead, which isn't one of them: Pittsburgh beat
// Cincinnati head-to-head and was listed third behind them. ESPN publishes
// the order with the real tiebreakers applied, so ties defer to it. Records
// still come from nflverse, so a stale ESPN fetch can only ever reorder
// teams with identical records, never misplace one with a better record.

import { readFile } from "node:fs/promises";
import path from "node:path";

// ESPN abbreviations that differ from nflverse's.
const TO_NFLVERSE: Record<string, string> = { WSH: "WAS", LAR: "LA" };

interface EspnStandingsNode {
  children?: EspnStandingsNode[];
  standings?: { entries: Array<{ team: { abbreviation: string } }> };
}

/** Team → position within its division (0 = first), or null if unavailable. */
export async function loadEspnDivisionOrder(): Promise<Map<string, number> | null> {
  let root: EspnStandingsNode;
  try {
    root = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "raw", "espn-standings.json"), "utf-8")
    );
  } catch {
    return null;
  }
  const order = new Map<string, number>();
  const walk = (node: EspnStandingsNode) => {
    node.standings?.entries.forEach((e, i) => {
      const abbr = e.team.abbreviation;
      order.set(TO_NFLVERSE[abbr] ?? abbr, i);
    });
    node.children?.forEach(walk);
  };
  walk(root);
  return order.size > 0 ? order : null;
}
