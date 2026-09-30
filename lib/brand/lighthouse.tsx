// The Beacon's lighthouse, in one place. Every copy of the logo — the
// header, the tab and home-screen icons, and the link-preview images —
// draws from here, so they can't drift apart.
//
// Designed for the navy header: white tower, red bands and roof, a lit
// lantern. The old mark drew near-black outlines on navy, which vanished
// and left a grey smudge at header size.
//
// Plain functions returning SVG elements (not components), because the
// icon and preview images are rendered by next/og, which serializes the
// <svg> as-is and won't run components inside it.

const WHITE = "#ffffff";
const RED = "#d1102e";
const SILVER = "#a5acaf";
const LIGHT = "#ffe7a3";

/** The tower with light beams — header and link previews. 4:3. */
export const BEAMS_VIEWBOX = "0 0 160 120";

/** The tower alone, cropped — tab and home-screen icons. */
export const TOWER_VIEWBOX = "54 14 52 106";

export function towerWithBeams(id = "beacon") {
  return [
    <defs key="defs">
      <linearGradient id={`${id}-beam-l`} x1="1" x2="0" y1="0" y2="0">
        <stop offset="0" stopColor={LIGHT} stopOpacity="0.95" />
        <stop offset="1" stopColor={LIGHT} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-beam-r`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={LIGHT} stopOpacity="0.95" />
        <stop offset="1" stopColor={LIGHT} stopOpacity="0" />
      </linearGradient>
    </defs>,
    <polygon key="beam-l" points="80,43 4,24 4,62" fill={`url(#${id}-beam-l)`} />,
    <polygon key="beam-r" points="80,43 156,24 156,62" fill={`url(#${id}-beam-r)`} />,
    ...tower(1),
  ];
}

/**
 * The tower, centred on x=80. `bands` is 1 for the header (with beams,
 * one band keeps it quiet) and 2 for the icons, where the extra stripe is
 * what makes it read as a lighthouse at 16px.
 *
 * Arrays, not fragments: next/og can't serialize a fragment inside <svg>.
 */
export function tower(bands: 1 | 2) {
  return [
    <polygon key="body" points="66,114 94,114 89,58 71,58" fill={WHITE} />,
    <polygon key="band-1" points="68.6,92 91.4,92 90.5,80 69.5,80" fill={RED} />,
    ...(bands === 2 ? [<polygon key="band-2" points="67.4,106 92.6,106 92,98 68,98" fill={RED} />] : []),
    <rect key="gallery" x="63" y="52" width="34" height="6" rx="1.5" fill={SILVER} />,
    <rect key="lantern" x="71" y="34" width="18" height="18" rx="1.5" fill={LIGHT} />,
    <polygon key="roof" points="67,35 93,35 80,22" fill={RED} />,
    <circle key="finial" cx="80" cy="19" r="3" fill={WHITE} />,
    <rect key="base" x="60" y="112" width="40" height="5" rx="1.5" fill={SILVER} />,
  ];
}
