import { BEAMS_VIEWBOX, towerWithBeams } from "@/lib/brand/lighthouse";

// The header logo: the lighthouse with its light beams (see
// lib/brand/lighthouse.tsx). `height` in pixels; it's 4:3 wide.
export function BeaconMark({ height = 34 }: { height?: number }) {
  return (
    <svg width={(height * 4) / 3} height={height} viewBox={BEAMS_VIEWBOX} role="img" aria-label="The Foxboro Beacon">
      {towerWithBeams("beacon-mark")}
    </svg>
  );
}
