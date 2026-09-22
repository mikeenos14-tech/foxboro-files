import type { VerdictTone } from "@/lib/calc/verdict";

// StatMuse's signature pattern: a bold, colored banner stating one
// headline fact as a real sentence, with the supporting data sitting
// right underneath it — not a bare number in a box, and not a table with
// no framing. Use for a genuine single-sentence takeaway, not as a
// generic card wrapper.
//
// The banner used to be red unconditionally, which reads as an error or
// alert in every UI convention regardless of what it says. Tone now
// tracks the actual verdict: navy for good news (the team's own color),
// amber for mixed, red reserved for genuinely bad.
const toneClass: Record<VerdictTone, string> = {
  good: "from-navy to-navy-deep",
  mixed: "from-rank-mid/80 to-rank-mid",
  bad: "from-red to-red-dark",
};

export function HeroAnswerCard({
  headline,
  tone = "bad",
  children,
}: {
  headline: React.ReactNode;
  tone?: VerdictTone;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className={`hero-texture bg-gradient-to-br px-4 py-5 sm:px-6 ${toneClass[tone]}`}>
        <p className="text-lg font-bold leading-snug text-white sm:text-xl">{headline}</p>
      </div>
      {children && <div className="p-4 sm:p-6">{children}</div>}
    </div>
  );
}
