import { ImageResponse } from "next/og";
import * as store from "@/lib/data/store";
import { ordinal } from "@/lib/calc/ranks";
import { formatDate } from "@/lib/util/format";

export const alt = "The Foxboro Beacon — New England Patriots analytics and coverage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [schedule, projection, nextGame, standings] = await Promise.all([
    store.getSchedule(),
    store.getSeasonProjection(),
    store.getNextGame(),
    store.getDivisionStandings(),
  ]);
  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;
  const ties = played.filter((g) => g.result === "T").length;
  const record = `${wins}-${losses}${ties > 0 ? `-${ties}` : ""}`;
  const rank = standings.findIndex((s) => s.isUs) + 1;
  const isHome = nextGame.homeTeam === "NE";
  const opponent = isHome ? nextGame.awayTeam : nextGame.homeTeam;

  const cardStyle = {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    padding: "22px 26px",
  };
  const cardLabel = {
    display: "flex",
    fontSize: 20,
    fontWeight: 600,
    color: "#a5acaf",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  };
  const cardValue = {
    display: "flex",
    fontSize: 46,
    fontWeight: 700,
    color: "white",
    marginTop: 6,
  };
  const cardSub = {
    display: "flex",
    fontSize: 20,
    color: "#a5acaf",
    marginTop: 4,
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a1f44 0%, #16305f 45%, #060f24 100%)",
          padding: "64px 80px",
          borderBottom: "12px solid #d1102e",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <svg width="72" height="86" viewBox="0 0 200 240">
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
                fontSize: 62,
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
              marginTop: 18,
              fontSize: 28,
              color: "#ff3b56",
              fontWeight: 600,
              display: "flex",
            }}
          >
            New England Patriots — Stats, Recaps &amp; Analysis
          </div>
        </div>

        <div style={{ display: "flex", gap: 22 }}>
          <div style={cardStyle}>
            <div style={cardLabel}>Record</div>
            <div style={cardValue}>{record}</div>
            <div style={cardSub}>{rank > 0 ? `${ordinal(rank)} in AFC East` : "AFC East"}</div>
          </div>
          <div style={cardStyle}>
            <div style={cardLabel}>Playoff Odds</div>
            <div style={cardValue}>
              {projection.playoffOdds !== undefined
                ? `${Math.round(projection.playoffOdds * 100)}%`
                : "—"}
            </div>
            <div style={cardSub}>
              Projected {projection.projectedWins}-{projection.projectedLosses}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={cardLabel}>Next Game</div>
            <div style={cardValue}>vs. {opponent}</div>
            <div style={cardSub}>{formatDate(nextGame.date)}</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
