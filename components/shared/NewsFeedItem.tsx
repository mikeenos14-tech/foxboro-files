import type { NewsItem } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";

const typeClasses: Record<NewsItem["type"], string> = {
  Injury: "bg-red/10 text-red",
  Transaction: "bg-navy/10 text-foreground",
  Analysis: "bg-rank-mid/10 text-rank-mid",
  "Beat Report": "bg-silver/20 text-muted",
};

export function NewsFeedItem({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="lift block rounded-lg border border-border bg-surface p-4 hover:border-navy/30"
    >
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${typeClasses[item.type]}`}
        >
          {item.type}
        </span>
        <span className="text-muted">{formatDate(item.publishedAt)}</span>
        <span className="text-muted">· {item.sourceName}</span>
      </div>
      <h3 className="mt-2 font-semibold text-foreground">{item.headline}</h3>
      <p className="mt-1 text-sm text-muted">{item.summary}</p>
    </a>
  );
}
