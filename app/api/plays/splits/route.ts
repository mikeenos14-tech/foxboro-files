import * as store from "@/lib/data/store";

// The Splits tab's season play lists — fetched on first tap, not shipped
// with the Roster page. Built at deploy time, served as a static file.
export const dynamic = "force-static";

export async function GET() {
  const plays = await store.getSplitPlays();
  return plays ? Response.json(plays) : new Response("Not found", { status: 404 });
}
