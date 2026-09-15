import * as store from "@/lib/data/store";
import { NewsFeed } from "@/components/news/NewsFeed";
import { InjuryTable } from "@/components/shared/InjuryTable";

export default async function NewsPage() {
  const [news, injuries] = await Promise.all([
    store.getNews(),
    store.getInjuries(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">News</h1>
        <p className="text-sm text-muted">
          What&apos;s happening with the team this week.
        </p>
      </div>

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
