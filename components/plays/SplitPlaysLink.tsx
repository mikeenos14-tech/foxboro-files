"use client";

import { useState } from "react";
import type { SplitPlays } from "@/lib/data/types";
import { PlaysDialog } from "./PlaysDialog";

// One fetch shared by every link on the page, started on the first tap.
let request: Promise<SplitPlays> | null = null;
function loadSplitPlays(): Promise<SplitPlays> {
  request ??= fetch("/api/plays/splits").then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  request.catch(() => (request = null));
  return request;
}

// A small "See the plays" link under a Splits row label.
export function SplitPlaysLink({ list, title }: { list: keyof SplitPlays["lists"]; title: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SplitPlays | null>(null);
  const [failed, setFailed] = useState(false);
  const show = () => {
    setOpen(true);
    if (!data) loadSplitPlays().then(setData).catch(() => setFailed(true));
  };
  return (
    <>
      <button
        onClick={show}
        aria-label={`See the plays: ${title}`}
        className="block py-1 text-[11px] text-muted underline decoration-dotted hover:text-foreground"
      >
        See the plays →
      </button>
      <PlaysDialog
        title={title}
        groups={failed ? [] : data ? data.lists[list] : null}
        plays={failed ? {} : data?.plays ?? null}
        open={open}
        onClose={() => setOpen(false)}
        showWeek
      />
    </>
  );
}
