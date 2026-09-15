import type { NewsItem } from "@/lib/data/types";
import { NewsFeedItem } from "@/components/shared/NewsFeedItem";

export function HeadlinesList({ items }: { items: NewsItem[] }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 4).map((item) => (
        <NewsFeedItem key={item.id} item={item} />
      ))}
    </div>
  );
}
