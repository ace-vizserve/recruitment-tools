import * as z from "zod";

import { aggregateReport } from "@/lib/reports/aggregate";
import { SAMPLE_MANATAL } from "@/lib/reports/fixtures/sample-manatal";
import { SAMPLE_REPORT } from "@/lib/reports/fixtures/sample-report";
import { normalizeManatalPayload } from "@/lib/reports/manatal";
import { isValidPeriodKey, resolvePeriod, type PeriodType } from "@/lib/reports/period";
import {
  isManatalPayload,
  isNotesOnlyPayload,
  ManatalPayloadSchema,
  ReportPayloadSchema,
} from "@/lib/reports/schema";

const N8N_RECRUITMENT_REPORT_WEBHOOK = process.env.N8N_RECRUITMENT_REPORT_WEBHOOK;
const MANATAL_OPEN_API_KEY = process.env.MANATAL_OPEN_API_KEY as string;
/** "1" serves the report-contract fixture, "manatal" the raw Manatal one. */
const REPORTS_FIXTURE = process.env.REPORTS_USE_FIXTURE;
const REPORTS_USE_FIXTURE = REPORTS_FIXTURE === "1" || REPORTS_FIXTURE === "manatal";

/** n8n has to answer inside this or we give up and report a timeout. */
const WEBHOOK_TIMEOUT_MS = 45_000;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERIOD_TYPES = new Set<PeriodType>(["weekly", "monthly", "all"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const organizationId = searchParams.get("organizationId");
    const periodType = searchParams.get("periodType") as PeriodType | null;
    const periodKey = searchParams.get("periodKey");

    if (!jobId) {
      return Response.json({ error: "jobId is required" }, { status: 400 });
    }
    if (!periodType || !PERIOD_TYPES.has(periodType)) {
      return Response.json({ error: "periodType must be 'weekly', 'monthly' or 'all'" }, { status: 400 });
    }
    if (!isValidPeriodKey(periodType, periodKey)) {
      return Response.json({ error: `Invalid ${periodType} period key` }, { status: 400 });
    }

    const period = resolvePeriod(periodType, periodKey as string);
    let payload: unknown;

    if (REPORTS_USE_FIXTURE) {
      // Short-circuits only the network hop — the schema, the Manatal adapter
      // and the real aggregator still run, so this exercises everything but n8n.
      // The fixture's own job identity is replaced with the requested one, so
      // it cannot appear to be a report for a job you did not select.
      payload =
        REPORTS_FIXTURE === "manatal"
          ? { ...SAMPLE_MANATAL, job: { ...SAMPLE_MANATAL.job, id: jobId, organization: organizationId } }
          : { ...SAMPLE_REPORT, job: { ...SAMPLE_REPORT.job, id: jobId, organizationId } };
    } else {
      if (!N8N_RECRUITMENT_REPORT_WEBHOOK) {
        console.error("N8N_RECRUITMENT_REPORT_WEBHOOK is not configured");
        return Response.json({ error: "Reporting service is not configured" }, { status: 500 });
      }

      // POST a single-item array — n8n's native item shape, so the Webhook
      // node yields one item and `{{ $json.job_id }}` resolves directly.
      // job_id is all that is sent: the workflow just relays Manatal's
      // responses and every period filter is applied here instead (the
      // /matches/ endpoint has no date filter to push it down to anyway).
      const webhookResponse = await fetch(N8N_RECRUITMENT_REPORT_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: MANATAL_OPEN_API_KEY,
        },
        body: JSON.stringify([{ job_id: jobId }]),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("[GET /api/reports] n8n webhook error:", webhookResponse.status, errorText);
        return Response.json(
          { error: "Failed to fetch report data", detail: errorText },
          { status: webhookResponse.status },
        );
      }

      payload = await webhookResponse.json();
    }

    // The bare notes feed is a common and specific misconfiguration, so name
    // it rather than emitting a schema dump the reader has to decode.
    if (isNotesOnlyPayload(payload)) {
      const noteCount = Array.isArray(payload) ? payload.length : 1;
      console.error(
        `[GET /api/reports] Webhook returned ${noteCount} drop note(s) and no match records`,
      );
      return Response.json(
        {
          error:
            `The reporting service returned ${noteCount === 1 ? "a single drop note" : `${noteCount} drop notes`} ` +
            "and no candidate match records. Every note describes a dropped candidate, so totals and pass " +
            "rates cannot be calculated. The webhook response needs to include the job's matches.",
        },
        { status: 502 },
      );
    }

    // n8n often hands back a single-item array rather than a bare object,
    // depending on how "Respond With" is configured. Unwrap it so both work.
    if (Array.isArray(payload) && payload.length === 1) {
      payload = payload[0];
    }

    // Two accepted shapes: our own report contract, or raw Manatal responses
    // relayed by n8n (which we map and period-filter ourselves, since
    // /matches/ offers no date filtering).
    let reportPayload;
    let manatalOutOfCohortDrops: number | null = null;
    let stagesDerived = false;

    if (isManatalPayload(payload)) {
      const parsed = ManatalPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        console.error("[GET /api/reports] Unexpected Manatal payload:", z.treeifyError(parsed.error));
        return Response.json(
          { error: "Unexpected report payload", detail: z.treeifyError(parsed.error) },
          { status: 502 },
        );
      }
      const normalized = normalizeManatalPayload(parsed.data, {
        from: period.from,
        to: period.to,
        jobId,
        organizationId,
      });
      reportPayload = normalized.payload;
      manatalOutOfCohortDrops = normalized.outOfCohortDrops;
      stagesDerived = normalized.stagesDerived;
    } else {
      const parsed = ReportPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        console.error("[GET /api/reports] Unexpected payload shape:", z.treeifyError(parsed.error));
        return Response.json(
          { error: "Unexpected report payload", detail: z.treeifyError(parsed.error) },
          { status: 502 },
        );
      }
      reportPayload = parsed.data;
    }

    // Rendering one job's numbers under another job's name is the kind of
    // error that ends up pasted into a report deck, so refuse it outright
    // rather than degrading.
    if (String(reportPayload.job.id) !== String(jobId)) {
      console.error(
        "[GET /api/reports] Job mismatch: asked for",
        jobId,
        "but the payload describes",
        reportPayload.job.id,
      );
      return Response.json(
        { error: "The reporting service returned data for a different job. Try again." },
        { status: 502 },
      );
    }

    const aggregate = aggregateReport(reportPayload, {
      generatedAt: new Date().toISOString(),
      periodType,
      periodKey: periodKey as string,
    });

    aggregate.isSampleData = REPORTS_USE_FIXTURE;

    if (stagesDerived) {
      aggregate.meta.degradations.push({
        code: "DERIVED_STAGE_LIST",
        message:
          "stages were inferred from the candidates present, so any stage nobody has reached is missing from the funnel",
        affectedCount: aggregate.stages.length,
      });
    }

    // The Manatal path sees the full match list, so it can count these exactly.
    if (manatalOutOfCohortDrops !== null) {
      aggregate.outOfCohortDrops = manatalOutOfCohortDrops;
    }

    if (!aggregate.meta.integrityOk) {
      console.error("[GET /api/reports] Stage integrity check failed for job", jobId, periodKey);
    }

    return Response.json(aggregate, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      console.error("[GET /api/reports] Webhook timed out");
      return Response.json({ error: "The reporting service timed out. Try again." }, { status: 504 });
    }
    console.error("[GET /api/reports] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
