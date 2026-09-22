"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Keeps a "which stat window is selected" choice in sync with a URL query
// param, so a link like "?teamWindow=last-1-weeks" is shareable/
// bookmarkable instead of only living in component state that resets on
// reload. The initial value always comes from the server-rendered page's
// own `searchParams` prop (passed in as `initialValue`), never read here
// directly — `window.location.search` is only touched inside the change
// handler, i.e. in response to a user event, never during render, so
// there's no hydration-mismatch risk.
export function useWindowParam(paramKey: string, initialValue: string | undefined, defaultKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState(initialValue ?? defaultKey);

  const select = useCallback(
    (key: string) => {
      setSelected(key);
      const params = new URLSearchParams(window.location.search);
      if (key === defaultKey) params.delete(paramKey);
      else params.set(paramKey, key);
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, paramKey, defaultKey]
  );

  return [selected, select] as const;
}
