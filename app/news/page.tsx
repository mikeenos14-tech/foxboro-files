import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { NewsFeed } from "@/components/news/NewsFeed";
import { InjuryTable } from "@/components/shared/InjuryTable";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const [news, injuries, digest] = await Promise.all([
    store.getNews(),
    store.getInjuries(),
    store.getBeatDigest(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">News</h1>
        <p className="text-sm text-muted">
          What&apos;s happening with the team this week.
        </p>
      </div>

      {digest && (
        <div className="rounded-lg border border-red/30 bg-red/5 p-4">
          <span className="text-xs font-bold uppercase tracking-wide text-red">
            What Beat Writers Are Saying
          </span>
          <p className="mt-2 text-sm leading-relaxed">{digest.text}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Injury Report</h2>
        <InjuryTable entries={injuries} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Latest Stories</h2>
        <NewsFeed items={news} />
      </div>
    </div>
  );
}
