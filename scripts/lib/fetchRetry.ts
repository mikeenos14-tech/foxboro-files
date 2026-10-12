// Downloads with a few retries. A one-off network blip or a GitHub
// release hiccup used to fail a whole refresh (stats run #62 lost its
// play-by-play download and the site waited for the noon retry). Three
// tries, a short wait between them; a real outage still fails after
// that, and is recorded and reported as before. A 404 is retried too —
// nflverse's schedule file 404'd while being republished.
export async function fetchWithRetry(url: string, tries = 3, waitMs = 5000): Promise<Response> {
  let last: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return res;
      last = new Error(`${res.status} ${res.statusText}`);
    } catch (err) {
      last = err;
    }
    if (attempt < tries) await new Promise((r) => setTimeout(r, waitMs * attempt));
  }
  throw last instanceof Error ? last : new Error(String(last));
}
