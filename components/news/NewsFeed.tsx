"use client";

import { useState } from "react";
import type { NewsItem, NewsType } from "@/lib/data/types";
import { NewsFeedItem } from "@/components/shared/NewsFeedItem";
import { NewsFilterBar } from "./NewsFilterBar";

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [filter, setFilter] = useState<NewsType | "All">("All");
  const filtered =
    filter === "All" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-4">
      <NewsFilterBar active={filter} onChange={setFilter} />
      <div className="space-y-3">
        {filtered.map((item) => (
          <NewsFeedItem key={item.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted">No stories in this category yet.</p>
        )}
      </div>
    </div>
  );
}
