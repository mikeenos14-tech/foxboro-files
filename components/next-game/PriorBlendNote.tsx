// Says, where it matters, that these numbers still lean on last season.
//
// The Next Game page is forward-looking, so its grades and EPA ranks
// blend the prior season while this one is young. The League page is a
// current-season leaderboard and doesn't. Both are right for their job,
// but the two disagree in a way a reader will spot and have no way to
// explain: in Week 3 of 2026, Jacksonville's defense ranked 7th here
// and 15th on the League page, and New England's pass offense graded
// 71st percentile here against 19th on the Roster page.
//
// Rather than pick one method everywhere and make one of the two pages
// worse at its job, the pages that blend say so. The weight is real and
// computed (see scripts/lib/priorBlend.ts), so this renders nothing at
// all once the blend is over — which happens at 4 games, after which
// the pages agree on their own and there's nothing left to explain.
export function PriorBlendNote({
  weight,
  className = "",
}: {
  weight: number;
  className?: string;
}) {
  if (weight <= 0) return null;
  const pct = Math.round(weight * 100);
  return (
    <p className={`text-xs text-muted ${className}`}>
      <span className="font-medium text-foreground">{pct}% last season.</span>{" "}
      These are forward-looking, so they lean on 2025 while this year&apos;s sample is
      thin, fading to zero at four games. The League and Roster pages count this season
      only, so their numbers will differ until then.
    </p>
  );
}
