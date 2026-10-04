import type { NewsItem } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";

const typeClasses: Record<NewsItem["type"], string> = {
  Injury: "bg-red/10 text-red",
  Transaction: "bg-navy/10 text-foreground",
  Analysis: "bg-rank-mid/10 text-rank-mid",
  "Beat Report": "bg-silver/20 text-muted",
};

// Title, then one meta line (tag · date · source). The summary is shown
// only on the News page; on Home the cards had five text styles each.
export function NewsFeedItem({ item, showSummary = true }: { item: NewsItem; showSummary?: boolean }) {
  return (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="lift block rounded-lg border border-border bg-surface p-4 hover:border-navy/30"
    >
      <h3 className="font-semibold leading-snug text-foreground">{item.headline}</h3>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${typeClasses[item.type]}`}
        >
          {item.type}
        </span>
        <span className="text-muted">{formatDate(item.publishedAt)}</span>
        <span className="text-muted">· {item.sourceName}</span>
      </div>
      {/* Some feeds repeat the headline as the summary ("Are the Patriots
          using Drake Maye the wrong way?" twice); show it once. */}
      {showSummary &&
        item.summary &&
        item.summary.trim().replace(/\W+$/, "").toLowerCase() !==
          item.headline.trim().replace(/\W+$/, "").toLowerCase() && (
          <p className="mt-1 text-sm text-muted">{item.summary}</p>
        )}
    </a>
  );
}
