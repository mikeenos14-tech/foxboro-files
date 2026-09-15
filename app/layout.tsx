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

// TODO once real hosting is set up: set NEXT_PUBLIC_SITE_URL so shared links
// resolve OG/social preview images to the real domain instead of localhost.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
