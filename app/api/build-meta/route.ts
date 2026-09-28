import * as store from "@/lib/data/store";

// When the deployed site's data was built. The daily health check
// (scripts/health-check.ts) compares this with the repo to catch a
// deploy that failed while the data kept updating.
export const dynamic = "force-static";

export async function GET() {
  return Response.json((await store.getBuildMeta()) ?? {});
}
