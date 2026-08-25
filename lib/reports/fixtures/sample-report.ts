/**
 * Development fixture, served when REPORTS_USE_FIXTURE=1.
 *
 * Deliberately hostile: every degradation code the aggregator can emit should
 * be reachable from this data. If you add a new degradation, add a record here
 * that triggers it.
 */

export const SAMPLE_REPORT = {
  job: {
    id: "3254221",
    title: "Subject Tuition Teacher - Mathematics",
    organizationId: "3779172",
    organizationName: "HFSE International School",
    createdAt: "2026-05-14T03:00:00Z",
    status: "active",
  },
  // Includes Offer and Hired — without them a hired candidate would look like
  // they never passed Initial Interview.
  stages: ["New Candidates", "Paper Screening", "Initial Interview", "Offer", "Hired"],
  matches: [
    // --- Straightforward progressions ------------------------------------
    {
      match_pk: "1001", candidate_id: "9001", candidate_name: "Amelia Tan", job_id: "3254221",
      current_stage: "Hired", furthest_stage: "Hired", applied_at: "2026-08-02T01:10:00Z",
      is_dropped: false, source: "Indeed",
    },
    {
      match_pk: "1002", candidate_id: "9002", candidate_name: "Bryan Lim", job_id: "3254221",
      current_stage: "Offer", furthest_stage: "Offer", applied_at: "2026-08-02T05:40:00Z",
      is_dropped: false, source: "MyCareersFuture",
    },
    {
      match_pk: "1003", candidate_id: "9003", candidate_name: "Chloe Ng", job_id: "3254221",
      current_stage: "Initial Interview", furthest_stage: "Initial Interview",
      applied_at: "2026-08-04T02:00:00Z", is_dropped: false, source: "Careers site",
    },
    {
      match_pk: "1004", candidate_id: "9004", candidate_name: "Daniel Wong", job_id: "3254221",
      current_stage: "Paper Screening", furthest_stage: "Paper Screening",
      applied_at: "2026-08-05T07:15:00Z", is_dropped: false, source: "Indeed",
    },
    {
      match_pk: "1005", candidate_id: "9005", candidate_name: "Elena Kaur", job_id: "3254221",
      current_stage: "New Candidates", furthest_stage: "New Candidates",
      applied_at: "2026-08-06T09:00:00Z", is_dropped: false, source: "Indeed",
    },
    {
      match_pk: "1006", candidate_id: "9006", candidate_name: "Farhan Osman", job_id: "3254221",
      current_stage: "New Candidates", furthest_stage: "New Candidates",
      applied_at: "2026-08-07T01:30:00Z", is_dropped: false, source: "MyCareersFuture",
    },
    {
      match_pk: "1007", candidate_id: "9007", candidate_name: "Grace Chua", job_id: "3254221",
      current_stage: "Initial Interview", furthest_stage: "Initial Interview",
      applied_at: "2026-08-08T03:45:00Z", is_dropped: false, source: "Careers site",
    },

    // --- Clean drops with structured reasons ------------------------------
    {
      match_pk: "1008", candidate_id: "9008", candidate_name: "Nikita Nangia", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "Initial Interview",
      applied_at: "2026-08-03T02:11:00Z", is_dropped: true,
      dropped_at: "2026-08-23T07:13:33Z", dropped_at_stage: "Initial Interview",
      drop_reasons: ["High Asking"], source: "Indeed",
    },
    {
      match_pk: "1009", candidate_id: "9009", candidate_name: "Hector Silva", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "Paper Screening",
      applied_at: "2026-08-04T06:20:00Z", is_dropped: true,
      dropped_at: "2026-08-12T04:00:00Z", dropped_at_stage: "Paper Screening",
      drop_reasons: ["Failed Paperscreening"], source: "Indeed",
    },
    // One drop citing three reasons — makes mentions exceed the drop count.
    {
      match_pk: "1010", candidate_id: "9010", candidate_name: "Iris Fernandez", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "New Candidates",
      applied_at: "2026-08-05T02:00:00Z", is_dropped: true,
      dropped_at: "2026-08-09T02:00:00Z", dropped_at_stage: "New Candidates",
      drop_reasons: ["Foreigner", "Pooling", "High Asking"],
      source: "MyCareersFuture",
    },

    // --- Reason only available as HTML (REASONS_PARSED_FROM_HTML) ---------
    {
      match_pk: "1011", candidate_id: "9011", candidate_name: "Jonas Rahman", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "New Candidates",
      applied_at: "2026-08-06T04:00:00Z", is_dropped: true,
      dropped_at: "2026-08-10T04:00:00Z", dropped_at_stage: "New Candidates",
      drop_reason_html: "<strong>Drop Reasons:</strong><br><br><li>Blacklisted</li><br><p></p>",
      source: "Indeed",
    },

    // --- No candidate name (MISSING_CANDIDATE_NAMES) ----------------------
    {
      match_pk: "1012", candidate_id: "9012", job_id: "3254221",
      current_stage: "Paper Screening", furthest_stage: "Paper Screening",
      applied_at: "2026-08-07T08:00:00Z", is_dropped: false, source: "Careers site",
    },

    // --- No furthest_stage (MISSING_FURTHEST_STAGE) -----------------------
    {
      match_pk: "1013", candidate_id: "9013", candidate_name: "Kelly Ong", job_id: "3254221",
      current_stage: "Paper Screening", applied_at: "2026-08-08T08:00:00Z",
      is_dropped: false, source: "Indeed",
    },

    // --- Dropped, no dropped_at_stage (MISSING_DROP_STAGE) ----------------
    {
      match_pk: "1014", candidate_id: "9014", candidate_name: "Liam Foster", job_id: "3254221",
      current_stage: "Paper Screening", furthest_stage: "Paper Screening",
      applied_at: "2026-08-09T01:00:00Z", is_dropped: true,
      dropped_at: "2026-08-15T01:00:00Z", dropped_at_stage: null,
      drop_reasons: ["Made Up Reason"], source: "Indeed",
    },

    // --- Dropped with no reason at all (REASONS_UNAVAILABLE) --------------
    {
      match_pk: "1015", candidate_id: "9015", candidate_name: "Mei Ling Koh", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "New Candidates",
      applied_at: "2026-08-10T02:30:00Z", is_dropped: true,
      dropped_at: "2026-08-14T02:30:00Z", dropped_at_stage: "New Candidates",
      source: "MyCareersFuture",
    },

    // --- Stage not in the pipeline (UNMAPPED_STAGES) ----------------------
    {
      match_pk: "1016", candidate_id: "9016", candidate_name: "Nadia Iskandar", job_id: "3254221",
      current_stage: "Talent Pool", furthest_stage: "Paper Screening",
      applied_at: "2026-08-11T03:00:00Z", is_dropped: false, source: "Careers site",
    },

    // --- Nothing maps at all (INVALID_RECORDS) ----------------------------
    {
      match_pk: "1017", candidate_id: "9017", candidate_name: "Omar Haddad", job_id: "3254221",
      current_stage: "Talent Pool", applied_at: "2026-08-11T05:00:00Z", is_dropped: false,
    },

    // --- Drop stage LATER than current stage (contradictory data) ---------
    // Must count once, as dropped at Initial Interview — never as both passed
    // and dropped, which would drive inProgress negative.
    {
      match_pk: "1018", candidate_id: "9018", candidate_name: "Priya Raman", job_id: "3254221",
      current_stage: "Offer", furthest_stage: "Offer",
      applied_at: "2026-08-12T02:00:00Z", is_dropped: true,
      dropped_at: "2026-08-20T02:00:00Z", dropped_at_stage: "Initial Interview",
      drop_reasons: ["With Job/Offer"], source: "Indeed",
    },

    // --- Same candidate applying twice (uniqueCandidates < applications) --
    {
      match_pk: "1019", candidate_id: "9005", candidate_name: "Elena Kaur", job_id: "3254221",
      current_stage: "New Candidates", furthest_stage: "New Candidates",
      applied_at: "2026-08-25T06:00:00Z", is_dropped: false, source: "Careers site",
    },

    // --- Reasons as prose, in variant spelling (REASONS_FROM_FREE_TEXT) ---
    // The note carries the heading but no list, so the split between reasons
    // is a guess. Both labels are lowercase variants of reasons other matches
    // spell properly, and must merge onto those bars rather than open new ones.
    {
      match_pk: "1020", candidate_id: "9020", candidate_name: "Rahul Menon", job_id: "3254221",
      current_stage: "Rejected", furthest_stage: "Paper Screening",
      applied_at: "2026-08-13T02:00:00Z", is_dropped: true,
      dropped_at: "2026-08-19T02:00:00Z", dropped_at_stage: "Paper Screening",
      source: "Indeed",
    },

    // --- Exact duplicate match_pk (DUPLICATE_RECORDS) ---------------------
    {
      match_pk: "1003", candidate_id: "9003", candidate_name: "Chloe Ng", job_id: "3254221",
      current_stage: "Initial Interview", furthest_stage: "Initial Interview",
      applied_at: "2026-08-04T02:00:00Z", is_dropped: false, source: "Careers site",
    },
  ],
  dropEvents: [
    // Two events for one match — the newer must win.
    {
      match_pk: "1011", candidate_id: "9011", job_id: "3254221", stage: "New Candidates",
      dropped_at: "2026-08-10T04:00:00Z", created_at: "2026-08-10T04:00:00Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Blacklisted</li><br><p></p>",
    },
    {
      match_pk: "1011", candidate_id: "9011", job_id: "3254221", stage: "New Candidates",
      dropped_at: "2026-08-10T03:00:00Z", created_at: "2026-08-10T03:00:00Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Stale</li><br><p></p>",
    },
    // Heading present, no list — the free-text branch of the parser.
    {
      match_pk: "1020", candidate_id: "9020", job_id: "3254221", stage: "Paper Screening",
      dropped_at: "2026-08-19T02:00:00Z", created_at: "2026-08-19T02:00:00Z",
      info: "<strong>Drop Reasons:</strong><br>high asking; foreigner",
    },
    // Dropped in August but applied in July — outside the cohort.
    {
      match_pk: "2001", candidate_id: "9101", job_id: "3254221", stage: "Paper Screening",
      dropped_at: "2026-08-18T02:00:00Z", created_at: "2026-08-18T02:00:00Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Position Filled</li><br><p></p>",
      outOfCohort: true,
    },
  ],
  meta: { generatedAt: "2026-09-05T02:11:00.000Z", sourceRecordCount: 22, truncated: false },
};
