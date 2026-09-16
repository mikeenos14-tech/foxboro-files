// Flat, simplified logo mark of the Gillette Stadium lighthouse: boxy
// profile, glass band with mullions, walkway ledge, flat overhanging roof,
// and the antenna light on top — an original drawing, not a copy of any
// photo, redrawn after studying real reference photos of the actual
// structure's proportions. See TopNav for the only current usage.
export function BeaconMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      role="img"
      aria-label="The Foxboro Beacon"
    >
      <g stroke="#0a1424" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
        <rect x="70" y="150" width="60" height="80" fill="#e7ecef" />
        <line x1="100" y1="150" x2="100" y2="230" strokeWidth={4} />
        <rect x="76" y="95" width="48" height="55" fill="#dce7ec" />
        <line x1="92" y1="95" x2="92" y2="150" strokeWidth={4} />
        <line x1="108" y1="95" x2="108" y2="150" strokeWidth={4} />
        <rect x="90" y="104" width="9" height="22" fill="#ff3b56" stroke="none" />
        <rect x="68" y="90" width="64" height="9" rx="1" fill="#0a1424" />
        <rect x="62" y="72" width="76" height="18" rx="4" fill="#0a1424" />
        <line x1="100" y1="72" x2="100" y2="54" strokeWidth={6} />
        <circle cx="100" cy="50" r="8" fill="#ff3b56" />
      </g>
    </svg>
  );
}
