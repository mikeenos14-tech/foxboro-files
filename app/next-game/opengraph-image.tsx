import { ImageResponse } from "next/og";
import { BEAMS_VIEWBOX, towerWithBeams } from "@/lib/brand/lighthouse";
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
          <svg width="56" height="42" viewBox={BEAMS_VIEWBOX}>
            {towerWithBeams("og")}
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
              <span style={{ color: "#a5acaf", margin: "0 20px", fontSize: 50 }}>{isHome ? "vs" : "@"}</span>
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
