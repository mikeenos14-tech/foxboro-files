import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { HeroAnswerCard } from "@/components/shared/HeroAnswerCard";
import { ordinal } from "@/lib/calc/ranks";
import { PriorBlendNote } from "@/components/next-game/PriorBlendNote";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const [rows, matchup] = await Promise.all([store.getSchedule(), store.getOpponentMatchup()]);

  const remaining = rows.filter((r) => !r.result);
  const remainingDivisional = remaining.filter((r) => r.isDivisional).length;
  const avgOpponentEpaRank =
    remaining.length > 0
      ? Math.round(remaining.reduce((sum, r) => sum + r.opponentEpaRank, 0) / remaining.length)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Schedule</h1>
        <p className="text-sm text-muted">
          Every game: results so far, and how tough the rest look.
        </p>
      </div>

      {remaining.length > 0 && avgOpponentEpaRank !== null && (
        <HeroAnswerCard
          headline={
            <>
              {remaining.length} games remain, {remainingDivisional} of them{" "}
              <span className="underline decoration-white/40">divisional</span> — the average
              remaining opponent ranks {ordinal(avgOpponentEpaRank)} in the NFL by EPA/play.
            </>
          }
        />
      )}

      <ScheduleTable rows={rows} />
      <PriorBlendNote weight={matchup.priorBlendWeight} subject="Win chances and opponent ranks" />
    </div>
  );
}
