"use client";

import { useState } from "react";
import Image from "next/image";
import { teamLogoUrl } from "@/lib/util/teamLogo";

export function TeamLogo({
  team,
  size = 24,
  onDark = false,
}: {
  team: string;
  size?: number;
  /** True when rendered on a navy/dark hero background, for fallback contrast. */
  onDark?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold ${
          onDark ? "bg-white/15 text-white" : "bg-navy/10 text-muted"
        }`}
      >
        {team}
      </span>
    );
  }

  return (
    <Image
      src={teamLogoUrl(team)}
      alt={`${team} logo`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="object-contain"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
