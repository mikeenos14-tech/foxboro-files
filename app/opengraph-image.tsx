import { ImageResponse } from "next/og";
import * as store from "@/lib/data/store";

export const alt = "Foxboro Files — New England Patriots analytics and coverage";
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 70, display: "flex" }}>🏈</div>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1,
              display: "flex",
            }}
          >
            FOXBORO FILES
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
