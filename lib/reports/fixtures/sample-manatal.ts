/**
 * Fixture in the raw Manatal shape, exactly as the n8n workflow relays it.
 * Served when REPORTS_USE_FIXTURE=manatal.
 *
 * The match records are real responses from
 * `/open/v3/jobs/3254221/matches/`, trimmed and re-dated into August 2026 so
 * they land inside a reportable period, plus a few added edge cases.
 */

export const SAMPLE_MANATAL = {
  job: {
    id: 3254221,
    position_name: "Subject Tuition Teacher - Mathematics",
    organization: 3779178,
    status: "active",
    created_at: "2026-05-14T03:00:00Z",
  },
  organizationName: "HAPI HAUS",

  // From /open/v3/job-pipelines/ — the live 10-stage pipeline. Note rank 3
  // holds no candidates here, which is exactly why the stage list has to come
  // from the pipeline endpoint rather than being derived from the matches.
  pipeline: {
    id: 784429,
    name: "Hiring Job Pipeline",
    job_pipeline_stages: [
      { id: 1601573, name: "New Candidates", rank: 0 },
      { id: 1606048, name: "Paper Screening", rank: 1 },
      { id: 1601574, name: "Initial Interview", rank: 2 },
      { id: 1601577, name: "RC/BC (Reference Check/Background Check)", rank: 3 },
      { id: 1601575, name: "Second Stage Interview", rank: 4 },
      { id: 1601576, name: "Final Interview", rank: 5 },
      { id: 1601578, name: "Offered", rank: 6 },
      { id: 1601579, name: "To Onboard", rank: 7 },
      { id: 1601580, name: "Started", rank: 8 },
      { id: 1601581, name: "Confirmation", rank: 9 },
    ],
  },

  // Wrapped in a page object, matching what n8n's HTTP Request node returns.
  matches: [
    {
      count: 12,
      next: null,
      previous: null,
      results: [
        // --- Dropped at New Candidates -------------------------------------
        {
          id: 124283529, candidate: 158017527, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: false, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-03T13:01:54.082614Z", dropped_at: "2026-08-18T06:08:16.760800Z",
          created_at: "2026-08-03T13:01:54.003903Z", updated_at: "2026-08-03T13:01:54.003920Z",
        },
        {
          id: 118070802, candidate: 150789938, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: false, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-04T07:11:21.999878Z", dropped_at: "2026-08-09T09:34:15.162020Z",
          created_at: "2026-08-04T07:11:21.925724Z", updated_at: "2026-08-04T07:11:21.925741Z",
        },
        // --- Dropped at Paper Screening ------------------------------------
        {
          id: 108836190, candidate: 125684180, job: 3254221, organization: 3779178,
          stage: { id: 1581354, name: "Paper Screening" },
          job_pipeline_stage: { id: 1606048, name: "Paper Screening", rank: 1 },
          is_active: false, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-05T08:00:51.965702Z", dropped_at: "2026-08-18T05:10:25.602869Z",
          created_at: "2026-08-05T08:00:51.925010Z", updated_at: "2026-08-06T04:08:19.586288Z",
        },
        // --- Dropped at Initial Interview, reason only in the activity feed --
        {
          id: 107701618, candidate: 138465913, job: 3254221, organization: 3779178,
          stage: { id: 1574848, name: "Initial Interview" },
          job_pipeline_stage: { id: 1601574, name: "Initial Interview", rank: 2 },
          is_active: false, hired_at: null, interview_at: "2026-08-20T07:13:14.905744Z", offer_at: null,
          submitted_at: "2026-08-06T03:35:29.516836Z", dropped_at: "2026-08-23T07:13:33.218826Z",
          created_at: "2026-08-06T03:35:29.471477Z", updated_at: "2026-08-20T07:13:14.913335Z",
        },
        // --- Reached Second Stage Interview (skips empty rank 3) ------------
        {
          id: 103922382, candidate: 129540212, job: 3254221, organization: 3779178,
          stage: { id: 1574849, name: "Second Stage Interview" },
          job_pipeline_stage: { id: 1601575, name: "Second Stage Interview", rank: 4 },
          is_active: false, hired_at: null, interview_at: "2026-08-12T00:42:32.413781Z", offer_at: null,
          submitted_at: "2026-08-07T13:10:20.040751Z", dropped_at: "2026-08-26T07:23:54.549544Z",
          created_at: "2026-08-07T13:10:19.962357Z", updated_at: "2026-08-12T11:43:04.851035Z",
        },
        // --- Still live, various stages -------------------------------------
        {
          id: 109344883, candidate: 140571905, job: 3254221, organization: 3779178,
          stage: { id: 1574848, name: "Initial Interview" },
          job_pipeline_stage: { id: 1601574, name: "Initial Interview", rank: 2 },
          is_active: true, hired_at: null, interview_at: "2026-08-14T04:08:23.239506Z", offer_at: null,
          submitted_at: "2026-08-08T05:46:55.768502Z", dropped_at: null,
          created_at: "2026-08-08T05:46:55.696624Z", updated_at: "2026-08-14T04:08:23.247038Z",
        },
        {
          id: 100822519, candidate: 129942519, job: 3254221, organization: 3779178,
          stage: { id: 1581354, name: "Paper Screening" },
          job_pipeline_stage: { id: 1606048, name: "Paper Screening", rank: 1 },
          is_active: true, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-10T14:36:50.274567Z", dropped_at: null,
          created_at: "2026-08-10T14:36:50.178961Z", updated_at: "2026-08-11T07:01:43.808483Z",
        },
        {
          id: 100718227, candidate: 129540289, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: true, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-12T10:07:17.958829Z", dropped_at: null,
          created_at: "2026-08-12T10:07:17.907611Z", updated_at: "2026-08-12T10:07:17.907632Z",
        },
        {
          id: 100716764, candidate: 129540290, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: true, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-08-14T09:49:38.218316Z", dropped_at: null,
          created_at: "2026-08-14T09:49:38.189468Z", updated_at: "2026-08-14T09:49:38.189489Z",
        },
        // --- Hired: must count as having passed every earlier stage ---------
        {
          id: 100606782, candidate: 125684517, job: 3254221, organization: 3779178,
          stage: { id: 1601581, name: "Confirmation" },
          job_pipeline_stage: { id: 1601581, name: "Confirmation", rank: 9 },
          is_active: true, hired_at: "2026-08-28T08:24:32.495301Z",
          interview_at: "2026-08-15T09:18:16.244009Z", offer_at: "2026-08-22T09:18:16.244009Z",
          submitted_at: "2026-08-02T06:20:41.598906Z", dropped_at: null,
          created_at: "2026-08-02T06:20:41.472066Z", updated_at: "2026-08-28T09:18:16.244009Z",
        },
        // --- Applied outside the window: excluded, but its August drop is
        //     counted separately as an out-of-cohort drop -------------------
        {
          id: 100191443, candidate: 129253964, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: false, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-07-13T10:02:10.161078Z", dropped_at: "2026-08-18T01:40:42.351172Z",
          created_at: "2026-07-13T10:02:10.124774Z", updated_at: "2026-07-13T10:02:10.124797Z",
        },
        // --- Applied and dropped entirely outside the window: ignored -------
        {
          id: 100162205, candidate: 129144552, job: 3254221, organization: 3779178,
          stage: { id: 1574616, name: "New Candidates" },
          job_pipeline_stage: { id: 1601573, name: "New Candidates", rank: 0 },
          is_active: false, hired_at: null, interview_at: null, offer_at: null,
          submitted_at: "2026-06-13T01:03:17.211371Z", dropped_at: "2026-06-18T01:40:59.460285Z",
          created_at: "2026-06-13T01:03:16.938150Z", updated_at: "2026-06-13T01:03:16.938175Z",
        },
      ],
    },
  ],

  // The activity feed, relayed unchanged. Note this endpoint mixes drop
  // records with ordinary recruiter comments, and stamps every activity on a
  // match with that match's `dropped_at` — so the comments cannot be told
  // apart by timestamp. Both hazards are represented below.
  dropEvents: [
    {
      id: 97818348, match_pk: "107701618", candidate_id: "138465913", job_id: "3254221",
      parent_object_name: "Nikita Nangia - Subject Tuition Teacher - Mathematics",
      stage: "Initial Interview", dropped_at: "2026-08-23T07:13:33.218826Z",
      created_at: "2026-08-23T07:13:33.207337Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>High Asking</li><br><p></p>",
    },
    // Same match, an earlier free-text comment. Must NOT become a drop reason.
    {
      id: 97126318, match_pk: "107701618", candidate_id: "138465913", job_id: "3254221",
      stage: "Initial Interview", dropped_at: "2026-08-23T07:13:33.218826Z",
      created_at: "2026-08-12T11:25:03.834496Z",
      info: "<p class=\"needsclick\">Hi Mr Raf</p><p class=\"needsclick\">Asking salary is beyond the budget. I'm not keen to proceed with this candidate. You may KIV.&nbsp;</p>",
    },
    {
      id: 97818349, match_pk: "124283529", candidate_id: "158017527", job_id: "3254221",
      stage: "New Candidates", dropped_at: "2026-08-18T06:08:16.760800Z",
      created_at: "2026-08-18T06:08:16.700000Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Foreigner</li><br><p></p>",
    },
    // A comment that arrives BEFORE the drop record in the array and shares an
    // identical dropped_at — the case that breaks a naive "latest wins" join.
    {
      id: 98530270, match_pk: "108836190", candidate_id: "125684180", job_id: "3254221",
      stage: "Paper Screening", dropped_at: "2026-08-18T05:10:25.602869Z",
      created_at: "2026-08-07T01:51:54.073741Z",
      info: "<p class=\"needsclick\">Hi Mr Raf</p><p class=\"needsclick\">You may proceed with the Initial interview. Thank you.&nbsp;</p>",
    },
    // Two genuine reasons on one match: pooled first, blacklisted later. The
    // later one is the real outcome.
    {
      id: 98830303, match_pk: "108836190", candidate_id: "125684180", job_id: "3254221",
      stage: "Paper Screening", dropped_at: "2026-08-18T05:10:25.602869Z",
      created_at: "2026-08-12T04:21:09.535140Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Pooling</li><br><p></p>",
    },
    {
      id: 99167059, match_pk: "108836190", candidate_id: "125684180", job_id: "3254221",
      stage: "Paper Screening", dropped_at: "2026-08-18T05:10:25.602869Z",
      created_at: "2026-08-18T05:10:25.574923Z",
      info: "<strong>Drop Reasons:</strong><br><br><li>Blacklisted</li><br><p></p>",
    },
    // 118070802 and 103922382 deliberately have no activity record at all, so
    // the "Not recorded" path stays exercised.
  ],
};
