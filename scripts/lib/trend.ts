// Real trend from the windowed grades that already exist: most recent
// single game vs. the full-season grade. Previously every card was
// hardcoded "flat", so the arrows were pure decoration occupying the
// top-right of every card — and the one card that showed a real arrow
// was the fabricated LB placeholder. A 10-point percentile move is the
// threshold for calling it a direction rather than noise.
export function trendFor(windows: Array<{ key: string; label: string; grade: number }>): "up" | "down" | "flat" {
  if (windows.length < 2) return "flat";
  const lastGame = windows[0].grade; // "last-1" — most recent single game
  const season = windows[windows.length - 1].grade; // widest window = full season
  const diff = lastGame - season;
  if (diff >= 10) return "up";
  if (diff <= -10) return "down";
  return "flat";
}
