import { entity_list } from "@/lib/constants";

const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY;

/**
 * How many active jobs each organization has, so the org picker can lead with
 * the ones actually hiring. Manatal has no bulk endpoint for this, so it is one
 * request per org — asking for a single result and reading the page `count`
 * rather than pulling every job back.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10_000;

let cache: { counts: Record<string, number>; at: number } | null = null;

async function activeJobCount(organizationId: number): Promise<number> {
  const query = new URLSearchParams({
    organization_id: String(organizationId),
    status: "active",
    page_size: "1",
  });

  const response = await fetch(`https://api.manatal.com/open/v3/jobs/?${query.toString()}`, {
    headers: { Authorization: `Token ${MANATAL_OPEN_API_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Manatal returned ${response.status}`);

  const data = (await response.json()) as { count?: unknown };
  if (typeof data.count !== "number") throw new Error("No count on the response");
  return data.count;
}

export async function GET() {
  if (!MANATAL_OPEN_API_KEY) {
    return Response.json({ error: "Manatal is not configured" }, { status: 500 });
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Response.json({ counts: cache.counts }, { status: 200 });
  }

  // allSettled, not all: one org failing must not blank the whole dropdown.
  // An org missing from the response simply sorts as unknown.
  const results = await Promise.allSettled(entity_list.map((org) => activeJobCount(org.id)));

  const counts: Record<string, number> = {};
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      counts[String(entity_list[index].id)] = result.value;
    } else {
      console.error("[GET /api/jobs/counts] Org", entity_list[index].id, "failed:", result.reason);
    }
  });

  // Don't cache a total wipeout — that would pin the failure for five minutes.
  if (Object.keys(counts).length > 0) {
    cache = { counts, at: Date.now() };
  }

  return Response.json({ counts }, { status: 200 });
}
