import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeInit } from "@/components/layout/ThemeInit";

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
// (NEXT_PUBLIC_SITE_URL) if one's set, otherwise falls back to Vercel's
// auto-assigned deployment URL (VERCEL_URL, set automatically in
// production/preview — no config needed there), then localhost for local
// dev. Set NEXT_PUBLIC_SITE_URL once a custom domain is attached.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Foxboro Files",
    template: "%s | Foxboro Files",
  },
  description,
  openGraph: {
    siteName: "Foxboro Files",
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
        <ThemeInit />
        <TopNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-20 sm:pb-6">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
