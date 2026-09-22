import * as store from "@/lib/data/store";

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
  const generatedAt = await store.getDataGeneratedAt();

  return (
    <footer className="mt-12 border-t border-border bg-surface py-6 text-center text-xs text-muted">
      <p>
        The Foxboro Beacon is an independent fan site, not affiliated with the NFL
        or any team. Stats sourced from nflverse (CC-BY 4.0) and public
        endpoints.
      </p>
      {generatedAt && (
        <p className="mt-2">
          Stats last updated <time dateTime={generatedAt}>{formatStamp(generatedAt)}</time>
        </p>
      )}
    </footer>
  );
}
