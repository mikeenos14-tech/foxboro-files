"use client";

import { useState } from "react";

// A long single-scroll page reads as slower and more overwhelming than
// the same content split into switchable views (the pattern most of
// Sofascore's UI is built on — Games/Standings/Players/Details/Media as
// tabs, not one long page). Kept deliberately simple: uncontrolled,
// activeIndex in local state, no URL sync — this is about page feel, not
// deep-linkable sub-routes.
export function Tabs({
  tabs,
}: {
  tabs: Array<{ label: string; content: React.ReactNode }>;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
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
