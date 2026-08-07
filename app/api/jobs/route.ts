const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entity-id");

    // Defaults preserve the original active+published behaviour for the link
    // generator. The reports job picker passes empty values to list every job,
    // because an August job may already be closed by the time it is reported on.
    const status = searchParams.get("status") ?? "active";
    const isPublished = searchParams.get("is_published") ?? "true";

    const query = new URLSearchParams({ organization_id: String(entityId) });
    if (status) query.set("status", status);
    if (isPublished) query.set("is_published", isPublished);

    const response = await fetch(
      `https://api.manatal.com/open/v3/jobs/?${query.toString()}`,
      {
        headers: {
          Authorization: `Token ${MANATAL_OPEN_API_KEY}`,
        },
      },
    );

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
