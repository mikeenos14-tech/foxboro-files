// Remembers which metrics have earned a league rank this season.
//
// The hysteresis in reliability.ts needs to know the previous state, but
// every build recomputes from scratch, so that state has to live
// somewhere. It's a small committed file rather than anything derived:
// the whole point is that it survives between runs.
//
// Scoped to a season and reset when the season rolls over — a metric
// that stabilized last November says nothing about Week 2 of the
// following year, when there are twenty plays in the bank.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GateState } from "./reliability";

const GATE_PATH = path.join(process.cwd(), "data/generated/metric-gates.json");

export interface GateFile {
  season: number;
  /** metric key -> the week it first cleared the bar. */
  openedAtWeek: Record<string, number>;
}

export async function loadGates(season: number): Promise<GateFile> {
  try {
    const parsed = JSON.parse(await readFile(GATE_PATH, "utf8")) as GateFile;
    if (parsed.season !== season) return { season, openedAtWeek: {} };
    return parsed;
  } catch {
    // Missing or unreadable: start closed. A lost file costs us a
    // suppressed rank for one build, which is the safe direction to
    // fail — it can never invent a rank that wasn't earned.
    return { season, openedAtWeek: {} };
  }
}

export function gateStateFor(gates: GateFile, key: string): GateState | undefined {
  return key in gates.openedAtWeek ? { open: true } : undefined;
}

export function recordGate(
  gates: GateFile,
  key: string,
  open: boolean,
  week: number
): void {
  if (open && !(key in gates.openedAtWeek)) {
    gates.openedAtWeek[key] = week;
  } else if (!open && key in gates.openedAtWeek) {
    // Dropped below the keep threshold — genuinely destabilized rather
    // than a wobble, since the keep bar is well under the open bar.
    delete gates.openedAtWeek[key];
  }
}

export async function saveGates(gates: GateFile): Promise<void> {
  await writeFile(GATE_PATH, JSON.stringify(gates, null, 2) + "\n");
}
