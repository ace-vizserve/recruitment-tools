const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY as string;

type Payload = {
  jobTitle: string;
  orgName: string;
  jobId: string;
  gegUrl: string;
  indeedUrl: string;
  myCareersUrl: string;
};

export async function POST(request: Request) {
  try {
    const body: Payload = await request.json();

    const { jobTitle, orgName, jobId, gegUrl, indeedUrl, myCareersUrl } = body;

    if (!jobTitle || !orgName || !jobId || !gegUrl || !indeedUrl || !myCareersUrl) {
      return Response.json({ error: "Missing required fields in payload" }, { status: 400 });
    }

    const response = await fetch(N8N_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", Token: MANATAL_OPEN_API_KEY },
      body: JSON.stringify({ jobTitle, orgName, jobId, gegUrl, indeedUrl, myCareersUrl }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[POST /api/notify] n8n webhook error:", errorBody);
      return Response.json({ error: "Failed to trigger n8n webhook", details: errorBody }, { status: response.status });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/notify] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
