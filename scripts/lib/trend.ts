// Real trend from the windowed grades that already exist: most recent
// single game vs. the full-season grade. Previously every card was
// hardcoded "flat", so the arrows were pure decoration occupying the
// top-right of every card — and the one card that showed a real arrow
// was the fabricated LB placeholder. A 10-point percentile move is the
// threshold for calling it a direction rather than noise.
//
// The season grade is passed in explicitly. This used to read it off the
// last entry of `windows`, but windows only ever holds the shorter
// "last N" slices — never the season itself — so every arrow was still
// flat: Run Defense went 19 → 3 in the last game and showed "▬".
export function trendFor(
  seasonGrade: number,
  windows: Array<{ key: string; label: string; grade: number }>
): "up" | "down" | "flat" {
  const lastGame = windows.find((w) => w.key === "last-1");
  if (!lastGame) return "flat";
  const diff = lastGame.grade - seasonGrade;
  if (diff >= 10) return "up";
  if (diff <= -10) return "down";
  return "flat";
}
