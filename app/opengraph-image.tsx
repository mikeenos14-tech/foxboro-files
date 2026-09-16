import { ImageResponse } from "next/og";
import * as store from "@/lib/data/store";

export const alt = "The Foxboro Beacon — New England Patriots analytics and coverage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [teamStats, schedule] = await Promise.all([
    store.getTeamStats(),
    store.getSchedule(),
  ]);
  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1f44 0%, #16305f 45%, #060f24 100%)",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="64" height="77" viewBox="0 0 200 240">
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
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1,
              display: "flex",
            }}
          >
            THE FOXBORO BEACON
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            color: "#c8102e",
            fontWeight: 600,
            display: "flex",
          }}
        >
          New England Patriots — Stats, Recaps &amp; Analysis
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 60,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#a5acaf", display: "flex" }}>Record</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: "white", display: "flex" }}>
              {wins}-{losses}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#a5acaf", display: "flex" }}>
              Offensive EPA/play
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: "white", display: "flex" }}>
              #{teamStats.epaPerPlay.offense.leagueRank} in NFL
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
