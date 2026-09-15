import { ImageResponse } from "next/og";
import * as store from "@/lib/data/store";
import { teamLogoUrl } from "@/lib/util/teamLogo";

export const alt = "Patriots game recap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const lastGame = await store.getLastGame();
  const recap = await store.getRecapByGameId(gameId);

  const isHome = lastGame.homeTeam === "NE";
  const opponent = isHome ? lastGame.awayTeam : lastGame.homeTeam;
  const usScore = isHome ? lastGame.homeScore : lastGame.awayScore;
  const themScore = isHome ? lastGame.awayScore : lastGame.homeScore;
  const won = (usScore ?? 0) > (themScore ?? 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1f44 0%, #16305f 45%, #060f24 100%)",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            color: won ? "#35b56d" : "#ff3b56",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {won ? "Win" : "Loss"} — Week {lastGame.week}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 24 }}>
          <img src={teamLogoUrl("NE")} width={140} height={140} alt="NE" />
          <div style={{ fontSize: 140, fontWeight: 700, color: "white", display: "flex" }}>
            {usScore}
            <span style={{ color: "#a5acaf", margin: "0 24px" }}>–</span>
            {themScore}
          </div>
          <img src={teamLogoUrl(opponent)} width={140} height={140} alt={opponent} />
        </div>
        <div style={{ fontSize: 30, color: "#a5acaf", marginTop: 24, display: "flex" }}>
          New England vs. {opponent}
        </div>
        {recap && (
          <div
            style={{
              fontSize: 22,
              color: "#7c8794",
              marginTop: 32,
              display: "flex",
              maxWidth: 900,
              textAlign: "center",
            }}
          >
            {recap.narrative.slice(0, 140)}...
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
