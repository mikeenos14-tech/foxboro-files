import { ImageResponse } from "next/og";
import { TOWER_VIEWBOX, tower } from "@/lib/brand/lighthouse";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1f44, #060f24)",
        }}
      >
        <svg width="73.6" height="150" viewBox={TOWER_VIEWBOX}>
          {tower(2)}
        </svg>
      </div>
    ),
    { ...size }
  );
}
