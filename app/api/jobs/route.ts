const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entity-id");

    const response = await fetch(`https://api.manatal.com/open/v3/jobs/?organization_id=${entityId}&status=active`, {
      headers: {
        Authorization: `Token ${MANATAL_OPEN_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return Response.json({ error: "Manatal API error", details: errorBody }, { status: response.status });
    }

    const data = await response.json();

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error("[GET /api/jobs] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
