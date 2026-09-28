import * as store from "@/lib/data/store";
import { DataFreshness } from "./DataFreshness";

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function Footer() {
  const meta = await store.getBuildMeta();
  // When play-by-play was last actually downloaded (falls back to the
  // build time for data built before that was recorded).
  const asOf = meta?.statsAsOf ?? meta?.generatedAt ?? null;

  return (
    <footer className="mt-12 border-t border-border bg-surface py-6 text-center text-xs text-muted">
      <p>
        The Foxboro Beacon is an independent fan site, not affiliated with the NFL
        or any team. Stats sourced from nflverse (CC-BY 4.0) and public
        endpoints.
      </p>
      {asOf && <DataFreshness asOf={asOf} label={formatStamp(asOf)} />}
    </footer>
  );
}
