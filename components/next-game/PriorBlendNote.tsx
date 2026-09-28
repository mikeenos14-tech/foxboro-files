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
//
// Also shown on Home (playoff odds) and Schedule (win chances), which are
// blended the same way and used to say nothing about it.
export function PriorBlendNote({
  weight,
  subject = "These numbers",
  onDark = false,
  className = "",
}: {
  weight: number;
  subject?: string;
  onDark?: boolean;
  className?: string;
}) {
  if (weight <= 0) return null;
  const pct = Math.round(weight * 100);
  return (
    <p className={`text-xs ${onDark ? "text-white/60" : "text-muted"} ${className}`}>
      <span className={`font-medium ${onDark ? "text-white/80" : "text-foreground"}`}>
        {subject} still lean {pct}% on last season.
      </span>{" "}
      This year&apos;s sample is small, so forward-looking numbers blend in 2025 and fade it out
      after four games. The League and Roster pages use this season only, so they&apos;ll differ
      until then.
    </p>
  );
}
