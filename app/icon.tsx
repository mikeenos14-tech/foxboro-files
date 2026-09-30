import { ImageResponse } from "next/og";
import { TOWER_VIEWBOX, tower } from "@/lib/brand/lighthouse";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1f44",
          borderRadius: 6,
        }}
      >
        <svg width="13.7" height="28" viewBox={TOWER_VIEWBOX}>
          {tower(2)}
        </svg>
      </div>
    ),
    { ...size }
  );
}
