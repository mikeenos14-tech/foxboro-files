import { ImageResponse } from "next/og";

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
        <svg width="118" height="141.6" viewBox="0 0 200 240">
          <rect x="70" y="150" width="60" height="80" fill="#e7ecef" stroke="#0a1424" strokeWidth="6" />
          <line x1="100" y1="150" x2="100" y2="230" stroke="#0a1424" strokeWidth="4" />
          <rect x="76" y="95" width="48" height="55" fill="#dce7ec" stroke="#0a1424" strokeWidth="6" />
          <line x1="92" y1="95" x2="92" y2="150" stroke="#0a1424" strokeWidth="4" />
          <line x1="108" y1="95" x2="108" y2="150" stroke="#0a1424" strokeWidth="4" />
          <rect x="90" y="104" width="9" height="22" fill="#ff3b56" />
          <rect x="68" y="90" width="64" height="9" rx="1" fill="#0a1424" stroke="#0a1424" strokeWidth="6" />
          <rect x="62" y="72" width="76" height="18" rx="4" fill="#0a1424" stroke="#0a1424" strokeWidth="6" />
          <line x1="100" y1="72" x2="100" y2="54" stroke="#0a1424" strokeWidth="6" />
          <circle cx="100" cy="50" r="8" fill="#ff3b56" stroke="#0a1424" strokeWidth="6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
