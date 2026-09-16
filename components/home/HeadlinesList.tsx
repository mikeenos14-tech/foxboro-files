import type { NewsItem } from "@/lib/data/types";
import { NewsFeedItem } from "@/components/shared/NewsFeedItem";

export function HeadlinesList({ items, limit = 4 }: { items: NewsItem[]; limit?: number }) {
  return (
    <div className="space-y-3">
      {items.slice(0, limit).map((item) => (
        <NewsFeedItem key={item.id} item={item} />
      ))}
    </div>
  );
}
