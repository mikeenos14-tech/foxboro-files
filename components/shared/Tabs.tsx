"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { tabKeyTarget } from "@/lib/util/tabKeys";

const slug = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

// A long single-scroll page reads as slower and more overwhelming than
// the same content split into switchable views (the pattern most of
// Sofascore's UI is built on — Games/Standings/Players/Details/Media as
// tabs, not one long page). Kept deliberately simple: uncontrolled,
// activeIndex in local state, no URL sync — this is about page feel, not
// deep-linkable sub-routes.
//
// `initialTab` (a label, case-insensitive) lets a link land on the tab it
// means — Home's "Full breakdown →" opened Roster on the QB tab rather
// than the grades it was pointing at.
// `paramKey` keeps the open tab in the URL (?tab=grades), so the back
// button and a shared link land on the tab the reader was on.
export function Tabs({
  tabs,
  initialTab,
  paramKey,
}: {
  tabs: Array<{ label: string; content: React.ReactNode }>;
  initialTab?: string;
  paramKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(() => {
    const want = initialTab ? slug(initialTab) : null;
    const i = want ? tabs.findIndex((t) => slug(t.label) === want) : -1;
    return i >= 0 ? i : 0;
  });
  const select = (i: number) => {
    setActive(i);
    if (!paramKey) return;
    const params = new URLSearchParams(window.location.search);
    if (i === 0) params.delete(paramKey);
    else params.set(paramKey, slug(tabs[i].label));
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-border"
        onKeyDown={(e) => {
          const next = tabKeyTarget(e, active, tabs.length);
          if (next !== null) select(next);
        }}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-2 py-2.5 text-sm font-semibold transition-colors sm:px-3 ${
              active === i
                ? "border-red text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-5">
        {tabs[active].content}
      </div>
    </div>
  );
}
