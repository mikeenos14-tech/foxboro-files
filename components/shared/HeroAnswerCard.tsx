// StatMuse's signature pattern: a bold, colored banner stating one
// headline fact as a real sentence, with the supporting data sitting
// right underneath it — not a bare number in a box, and not a table with
// no framing. Use for a genuine single-sentence takeaway (a season
// record, a streak, a superlative), not as a generic card wrapper.
export function HeroAnswerCard({
  headline,
  children,
}: {
  headline: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="hero-texture bg-gradient-to-br from-red to-red-dark px-4 py-5 sm:px-6">
        <p className="text-lg font-bold leading-snug text-white sm:text-xl">{headline}</p>
      </div>
      {children && <div className="p-4 sm:p-6">{children}</div>}
    </div>
  );
}
