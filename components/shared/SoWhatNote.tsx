export type Sentiment = "good" | "mid" | "bad" | "neutral";

const borderClass: Record<Sentiment, string> = {
  good: "border-rank-good",
  mid: "border-rank-mid",
  bad: "border-rank-bad",
  neutral: "border-navy",
};

export function SoWhatNote({
  children,
  sentiment = "neutral",
}: {
  children: React.ReactNode;
  sentiment?: Sentiment;
}) {
  return (
    <p
      className={`mt-2 border-l-2 pl-2 text-sm italic text-muted ${borderClass[sentiment]}`}
    >
      {children}
    </p>
  );
}
