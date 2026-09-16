import { ImageResponse } from "next/og";
import * as store from "@/lib/data/store";
import { teamLogoUrl } from "@/lib/util/teamLogo";
import { formatDate } from "@/lib/util/format";

export const alt = "Upcoming Patriots game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [game, matchup] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
  ]);
  const isHome = game.homeTeam === "NE";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a1f44 0%, #16305f 45%, #060f24 100%)",
          padding: "44px 80px",
          borderBottom: "12px solid #d1102e",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="38" height="46" viewBox="0 0 200 240">
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
          <div style={{ fontSize: 26, fontWeight: 700, color: "white", letterSpacing: -0.5, display: "flex" }}>
            THE FOXBORO BEACON
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#ff3b56",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Week {game.week} · {isHome ? "Home" : "Away"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 24 }}>
            <img src={teamLogoUrl("NE")} width={150} height={150} alt="NE" />
            <div style={{ fontSize: 90, fontWeight: 700, color: "white", display: "flex" }}>
              NE
              <span style={{ color: "#a5acaf", margin: "0 20px", fontSize: 50 }}>vs</span>
              {matchup.opponent}
            </div>
            <img src={teamLogoUrl(matchup.opponent)} width={150} height={150} alt={matchup.opponent} />
          </div>
          <div style={{ fontSize: 30, color: "#a5acaf", marginTop: 28, display: "flex" }}>
            {formatDate(game.date)} · {game.venue}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
