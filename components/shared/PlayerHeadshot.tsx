"use client";

import { useState } from "react";
import Image from "next/image";

// Prefers nflverse's own headshot_url (NFL.com-hosted, ~99% roster
// coverage) over anything ESPN-ID-derived, which covered meaningfully
// fewer players. Falls back to initials if there's no URL, or if the
// image fails to load.
export function PlayerHeadshot({
  name,
  imageUrl,
  size = 48,
}: {
  name: string;
  imageUrl?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (imageUrl && !failed) {
    return (
      <Image
        src={imageUrl}
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
