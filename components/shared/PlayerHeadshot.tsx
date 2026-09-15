"use client";

import { useState } from "react";
import Image from "next/image";

// Real headshots are sourced via each player's mapped espnId (Phase 2/3
// pipeline). If a player has no espnId, or the image fails to load, fall
// back to initials so the layout never breaks.
export function PlayerHeadshot({
  name,
  espnId,
  size = 48,
}: {
  name: string;
  espnId?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (espnId && !failed) {
    return (
      <Image
        src={`https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full bg-silver-light object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
    >
      {initials}
    </div>
  );
}
