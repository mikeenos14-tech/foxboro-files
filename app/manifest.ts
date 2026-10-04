import type { MetadataRoute } from "next";

// Lets the site be installed as an app from Chrome/Android and tells iOS
// how to show it from the home screen (see also `appleWebApp` in
// layout.tsx). The icons are the ones app/icon.tsx and app/apple-icon.tsx
// already generate.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Foxboro Beacon",
    short_name: "Beacon",
    description: "New England Patriots stats, recaps and analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#0a1f44",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
