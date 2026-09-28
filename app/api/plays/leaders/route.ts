import * as store from "@/lib/data/store";

// The Leaders tab's play lists, fetched only when someone taps a player —
// about 100 KB, too much to ship with every Roster page view. Built once
// at deploy time and served as a static file.
export const dynamic = "force-static";

export async function GET() {
  const plays = await store.getLeaderPlays();
  return plays ? Response.json(plays) : new Response("Not found", { status: 404 });
}
