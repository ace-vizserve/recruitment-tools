const N8N_SEND_EMAIL_WEBHOOK = process.env.N8N_SEND_EMAIL_WEBHOOK;
const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY as string;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, subject, body: emailBody } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: "No recipients provided" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return Response.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!emailBody || typeof emailBody !== "string" || !emailBody.trim()) {
      return Response.json({ error: "Email body is required" }, { status: 400 });
    }
    if (!N8N_SEND_EMAIL_WEBHOOK) {
      console.error("N8N_SEND_EMAIL_WEBHOOK is not configured");
      return Response.json({ error: "Email service is not configured" }, { status: 500 });
    }

    const n8nResponse = await fetch(N8N_SEND_EMAIL_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: MANATAL_OPEN_API_KEY,
      },
      body: JSON.stringify({
        recipients,
        subject: subject.trim(),
        body: emailBody,
        sentAt: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("[POST] n8n webhook error:", n8nResponse.status, errorText);
      return Response.json(
        { error: "Failed to trigger email workflow", detail: errorText },
        { status: n8nResponse.status },
      );
    }

    const n8nData = await n8nResponse.json().catch(() => null);

    return Response.json(
      { success: true, message: `Email queued for ${recipients.length} recipient(s)`, data: n8nData },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
