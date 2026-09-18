import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const description =
  "An analytics-driven New England Patriots fan site: recaps, opponent breakdowns, schedule strength, news, and stats vs. the league.";

// Resolves OG/social preview image URLs. Prefers an explicit custom domain
// (NEXT_PUBLIC_SITE_URL) once one's attached. Otherwise: on a production
// deploy, VERCEL_URL is actually the unique per-deployment URL (a new one
// every deploy, not the stable foxboro-files.vercel.app domain people
// actually share) — VERCEL_PROJECT_PRODUCTION_URL is the one that stays
// constant. On preview deployments there's no stable equivalent, so
// VERCEL_URL (that preview's own URL) is the correct choice there. Falls
// back to localhost for local dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

// viewportFit: "cover" lets the page draw under the notch/home-indicator/
// rounded-corner safe areas instead of Safari auto-letterboxing around
// them — needed so the fixed bottom nav (BottomNav.tsx) can read the real
// env(safe-area-inset-*) values and pad itself to match, rather than the
// browser silently keeping content inset with no way for us to know by
// how much. Most visible when the site is added to the iOS home screen,
// where there's no browser chrome to absorb that space.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "The Foxboro Beacon",
    template: "%s | The Foxboro Beacon",
  },
  description,
  openGraph: {
    siteName: "The Foxboro Beacon",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${oswald.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Dark is the site's real default identity, not just "whatever
            the OS prefers" — this runs synchronously before first paint
            (a plain script tag, not next/script, so it isn't deferred)
            so every fresh visitor sees dark immediately with zero flash,
            while anyone who's explicitly chosen light keeps that choice.
            ThemeToggle.tsx writes the same localStorage key on every
            switch. Safe with the html tag's suppressHydrationWarning
            above since this only ever runs client-side. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("foxboro-beacon-theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
        <TopNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
