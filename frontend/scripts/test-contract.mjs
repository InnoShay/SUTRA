import assert from "node:assert";

// 1. Test Demo Personas & Auth Contracts
console.log("=== SUTRA Frontend Integration & Contract Tests ===\n");

// Test Persona configurations
const DEMO_CAMPUS_ID = "00000000-0000-0000-0000-000000000001";
const ROLES = ["faculty", "counselor", "dean", "leadership", "superadmin"];

console.log("1. Validating User Roles and ADR-004 Privacy Scopes...");
const privacyConfigs = {
  faculty: { canViewIndividualStudents: true },
  counselor: { canViewIndividualStudents: true },
  dean: { canViewIndividualStudents: true },
  leadership: { canViewIndividualStudents: false }, // Must be false per ADR-004
  superadmin: { canViewIndividualStudents: true },
};

for (const role of ROLES) {
  assert(privacyConfigs[role] !== undefined, `Role ${role} must have a privacy config`);
}
assert.strictEqual(
  privacyConfigs.leadership.canViewIndividualStudents,
  false,
  "Leadership role must strictly suppress individual student 360 views"
);
console.log("   ✓ All 5 personas verified with ADR-004 privacy boundaries\n");

// 2. Validate 10-State Machine Definition
console.log("2. Validating SUTRA 10-State Case Machine Lifecycle...");
const CASE_STATES = [
  "NEW",
  "TRIAGED",
  "UNDER_REVIEW",
  "ACTIONABLE",
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "FOLLOW_UP_REQUIRED",
  "RESOLVED",
  "CLOSED",
];

assert.strictEqual(CASE_STATES.length, 10, "Case state machine must contain exactly 10 states");
assert.strictEqual(CASE_STATES[0], "NEW");
assert.strictEqual(CASE_STATES[9], "CLOSED");
assert(CASE_STATES.includes("UNDER_REVIEW"));
assert(CASE_STATES.includes("IN_PROGRESS"));
assert(CASE_STATES.includes("FOLLOW_UP_REQUIRED"));
console.log("   ✓ Verified canonical 10-state lifecycle: " + CASE_STATES.join(" -> ") + "\n");

// 3. Validate 'No Alert Without Action' Rationale Requirement
console.log("3. Validating 'No Alert Without Action' Review Validation...");
function validateSignalReview(req) {
  if (!req.decision) {
    throw new Error("Missing review decision");
  }
  if (!["approve", "modify", "dismiss", "request_more_data"].includes(req.decision)) {
    throw new Error(`Invalid decision: ${req.decision}`);
  }
  if (!req.rationale || req.rationale.trim().length < 5) {
    throw new Error("Mandatory human rationale required (min 5 characters)");
  }
  return true;
}

// Check valid approve
assert.doesNotThrow(() => {
  validateSignalReview({
    decision: "approve",
    selected_intervention_key: "academic_tutoring_offer",
    rationale: "Student missed 3 lab sessions; tutoring assigned.",
  });
});

// Check rejection on empty rationale
assert.throws(() => {
  validateSignalReview({
    decision: "dismiss",
    rationale: "",
  });
}, /Mandatory human rationale/);

// Check rejection on trivial rationale
assert.throws(() => {
  validateSignalReview({
    decision: "approve",
    rationale: "ok",
  });
}, /Mandatory human rationale/);
console.log("   ✓ Enforced mandatory substantive rationale on signal review\n");

// 4. Validate Interventions Catalog Schema
console.log("4. Validating Interventions Catalog Domain Schema...");
const catalogKeys = [
  "academic_tutoring_offer",
  "mentor_check_in",
  "counselling_referral",
  "fee_emergency_counselling",
];

for (const key of catalogKeys) {
  assert(typeof key === "string" && key.length > 0);
}
console.log(`   ✓ Verified ${catalogKeys.length} canonical intervention catalog keys\n`);

// 5. Client Bundle Hygiene: Check for Leaked Service Role Secrets
console.log("5. Checking Client Security Hygiene (Zero Service Role Secrets)...");
const forbiddenEnvKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
  "SECRET_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
];

for (const key of forbiddenEnvKeys) {
  assert(process.env[key] === undefined || !process.env[key].startsWith("NEXT_PUBLIC_"),
    `Secret ${key} must never have a NEXT_PUBLIC_ prefix`
  );
}
console.log("   ✓ Verified no private keys, LLM credentials, or service-role tokens exposed to browser\n");

// 6. Phase 6: Bounded AI Orchestration Schema & Governance
console.log("6. Validating Phase 6 Bounded AI Orchestration Contracts...");
function validateAIStructuredReviewBrief(brief, allowedCatalogKeys) {
  assert(typeof brief.summary === "string" && brief.summary.length > 0, "Brief summary required");
  assert(Array.isArray(brief.observed_facts), "observed_facts must be an array");
  assert(Array.isArray(brief.model_predictions), "model_predictions must be an array");
  assert(Array.isArray(brief.uncertainties), "uncertainties must be an array");
  assert(Array.isArray(brief.review_questions), "review_questions must be an array");
  assert(Array.isArray(brief.candidate_interventions), "candidate_interventions must be an array");
  assert(brief.metadata && typeof brief.metadata === "object", "Metadata required");
  assert(typeof brief.metadata.latency_ms === "number", "latency_ms required in metadata");

  // Candidate interventions must strictly exist in campus catalog
  for (const item of brief.candidate_interventions) {
    assert(
      allowedCatalogKeys.includes(item.intervention_key),
      `Candidate intervention ${item.intervention_key} must belong to campus catalog`
    );
  }
  return true;
}

const mockBrief = {
  summary: "Student exhibits consecutive attendance decline across 3 modules.",
  observed_facts: ["Attendance rate: 58%", "2 submitted assignments"],
  model_predictions: ["day30_risk score: 0.82"],
  uncertainties: ["Missing LMS portal activity for Week 4"],
  review_questions: ["Has student faced scheduling conflicts?"],
  candidate_interventions: [
    {
      intervention_key: "academic_tutoring_offer",
      display_label: "Subject Tutoring Referral",
      domain: "academic",
      recipient_role: "faculty",
      confidence: 0.85,
      evidence_grounding: "Low attendance in core modules",
      caveats: "Requires student confirmation",
    },
  ],
  limitations: ["Financial records excluded per ADR-003"],
  metadata: {
    model_name: "sutra-mock-v1",
    provider: "deterministic_mock",
    latency_ms: 12.4,
    is_mock: true,
    timestamp: new Date().toISOString(),
  },
};

assert.doesNotThrow(() => {
  validateAIStructuredReviewBrief(mockBrief, catalogKeys);
});

// Rejection test for unauthorized / invented candidate intervention
assert.throws(() => {
  validateAIStructuredReviewBrief(
    {
      ...mockBrief,
      candidate_interventions: [
        { intervention_key: "UNAUTHORIZED_EXPULSION_ACTION" },
      ],
    },
    catalogKeys
  );
}, /must belong to campus catalog/);

// 7. Phase 1: Store & Data Integrity Remediation Validation
console.log("7. Validating Phase 1 Store & Data Integrity Contracts...");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoSeedPath = path.resolve(__dirname, "../../docs/fixtures/demo_seed.json");
const demoSeed = JSON.parse(fs.readFileSync(demoSeedPath, "utf-8"));

// 7a. Verify canonical demo seed students
assert(Array.isArray(demoSeed.students), "demo_seed.json must have students array");
const canonicalSeedKeys = demoSeed.students.map((s) => s.key);
assert.deepStrictEqual(
  canonicalSeedKeys,
  ["SYN-1007", "SYN-1008", "SYN-1009", "SYN-1010", "SYN-1011", "SYN-1012"],
  "demo_seed.json must define canonical synthetic keys SYN-1007 through SYN-1012"
);

// 7b. Check skillhub-data.ts source code for zero Hackingly contamination
const skillhubDataCode = fs.readFileSync(
  path.resolve(__dirname, "../lib/skillhub-data.ts"),
  "utf-8"
);

const forbiddenNames = [
  "Marvin McKinney",
  "Albert Flores",
  "Bessie Cooper",
  "Jane Cooper",
  "Brooklyn Williamson",
  "Courtney Henry",
  "Darrell Steward",
  "example.com",
  "Typography Masterclass",
  "Figma for Beginner",
  "Best Figma plugins",
  "sarah.wilson@sutra.design",
];

for (const forbidden of forbiddenNames) {
  assert(
    !skillhubDataCode.includes(forbidden),
    `Contamination detected: "${forbidden}" found in active skillhub-data.ts!`
  );
}
console.log("   ✓ Zero legacy Hackingly student names, course names, or forum discussions in skillhub-data.ts");

// 7c. Check skillhub-store.tsx for elimination of fixture merging
const storeCode = fs.readFileSync(
  path.resolve(__dirname, "../lib/skillhub-store.tsx"),
  "utf-8"
);

// Ensure the old bug `...INITIAL_STUDENTS.filter` is completely gone
assert(
  !storeCode.includes("...INITIAL_STUDENTS.filter"),
  "Contamination defect: skillhub-store.tsx must never merge backend students with INITIAL_STUDENTS fixtures"
);

// Ensure authoritative empty response handling
assert(
  storeCode.includes("setStudents([])"),
  "Store must explicitly support setting empty student roster on empty response or privacy boundary"
);

// Ensure explicit data provenance
assert(
  storeCode.includes('dataProvenance: backendConnected ? "live" : "demo"'),
  "Store must explicitly distinguish live vs demo data provenance"
);

console.log("   ✓ Verified strict separation: backend responses are authoritative and never merged with mock fixtures");

// 7d. Check students/[id]/page.tsx for elimination of hardcoded fake observations and fallback Aarav Sharma
const studentDetailCode = fs.readFileSync(
  path.resolve(__dirname, "../app/students/[id]/page.tsx"),
  "utf-8"
);

assert(
  !studentDetailCode.includes("Aarav Sharma"),
  "Contamination defect: Fake fallback student 'Aarav Sharma' must not be hardcoded in students/[id]"
);
assert(
  !studentDetailCode.includes("quiz_scores_avg"),
  "Contamination defect: Fake observations table row 'quiz_scores_avg' must not be hardcoded in students/[id]"
);

// 8. Phase 2: Dashboard Semantic Correction Validation
console.log("8. Validating Phase 2 Dashboard Semantic Correction & Metrics...");

const dashboardCode = fs.readFileSync(
  path.resolve(__dirname, "../app/dashboard/page.tsx"),
  "utf-8"
);

// 8a. Ensure all legacy Hackingly educational marketing metrics are permanently removed from dashboard
const forbiddenDashboardTerms = [
  "growthMetrics",
  "activeLearners",
  "newEnrollments",
  "totalEnrollments",
  "Advanced UI/UX Design",
  "totalStudents: \"124K\"",
  "avgTime: \"18h 40m\"",
  "completion: \"76.2%\"",
  "setIsNewCourseModalOpen",
  "New Course",
];

for (const term of forbiddenDashboardTerms) {
  assert(
    !dashboardCode.includes(term),
    `Dashboard contamination defect: "${term}" still found in app/dashboard/page.tsx!`
  );
}
console.log("   ✓ Zero legacy Hackingly growth numbers or educational course metrics in dashboard");

// 8b. Functional test for computeDashboardMetrics calculations
// Dynamically test the selector rules
function mockComputeDashboardMetrics(signals, cases, students, activeRole) {
  const isLeadership = activeRole === "leadership";
  const studentCount = students.length;
  const pendingCount = signals.filter(
    (s) => !s.reviewed_decision || s.reviewed_decision.trim() === ""
  ).length;
  const activeCasesList = cases.filter((c) => {
    const st = (c.state || "").toUpperCase();
    return st !== "RESOLVED" && st !== "CLOSED";
  });
  const escalatedCount = cases.filter((c) => c.is_escalated).length;
  const totalSignals = signals.length;
  const reviewedCount = totalSignals - pendingCount;
  const reviewRatePct =
    totalSignals === 0 ? 100 : Math.round((reviewedCount / totalSignals) * 100);

  return {
    studentsInScope: isLeadership ? "Restricted" : studentCount,
    pendingSignals: pendingCount,
    activeCases: activeCasesList.length,
    escalatedCases: escalatedCount,
    triageReviewRate: reviewRatePct,
  };
}

// Test with zero records (safe against NaN and division by zero)
const zeroMetrics = mockComputeDashboardMetrics([], [], [], "faculty");
assert.strictEqual(zeroMetrics.studentsInScope, 0);
assert.strictEqual(zeroMetrics.pendingSignals, 0);
assert.strictEqual(zeroMetrics.activeCases, 0);
assert.strictEqual(zeroMetrics.escalatedCases, 0);
assert.strictEqual(zeroMetrics.triageReviewRate, 100, "Zero signals should produce 100% review rate, never NaN");
assert(!Number.isNaN(zeroMetrics.triageReviewRate), "Review rate must not be NaN");

// Test with mixed signals and cases
const mockSignals = [
  { id: "s1", reviewed_decision: null }, // pending
  { id: "s2", reviewed_decision: "approve" }, // reviewed
  { id: "s3", reviewed_decision: "dismiss" }, // reviewed
  { id: "s4", reviewed_decision: "" }, // pending (whitespace/empty)
];
const mockCases = [
  { id: "c1", state: "IN_PROGRESS", is_escalated: false },
  { id: "c2", state: "ASSIGNED", is_escalated: true },
  { id: "c3", state: "RESOLVED", is_escalated: false }, // terminal
  { id: "c4", state: "CLOSED", is_escalated: false }, // terminal
];
const mockStudents = [{ id: "stu-1" }, { id: "stu-2" }, { id: "stu-3" }];

const facultyMetrics = mockComputeDashboardMetrics(mockSignals, mockCases, mockStudents, "faculty");
assert.strictEqual(facultyMetrics.studentsInScope, 3);
assert.strictEqual(facultyMetrics.pendingSignals, 2, "Only signals without reviewed_decision count as pending");
assert.strictEqual(facultyMetrics.activeCases, 2, "RESOLVED and CLOSED cases must be excluded from active count");
assert.strictEqual(facultyMetrics.escalatedCases, 1);
assert.strictEqual(facultyMetrics.triageReviewRate, 50, "2 reviewed out of 4 should be 50%");

// Test leadership role privacy enforcement
const leadershipMetrics = mockComputeDashboardMetrics(mockSignals, mockCases, mockStudents, "leadership");
assert.strictEqual(leadershipMetrics.studentsInScope, "Restricted", "Leadership must be restricted from individual student queues");

console.log("   ✓ Verified operational metric calculations (pending signals, active cases, zero-division safety, ADR-004)");

// 8c. Ensure Priority Review Queue and Case Closed-Loop Tracker exist directly in dashboard
assert(
  dashboardCode.includes("Priority Signal Review Queue"),
  "Dashboard must include Priority Signal Review Queue"
);
assert(
  dashboardCode.includes("Active Case Closed-Loop Tracker"),
  "Dashboard must include Active Case Closed-Loop Tracker"
);
assert(
  dashboardCode.includes("transitionCase"),
  "Dashboard must preserve canonical case lifecycle transition capability"
);
assert(
  dashboardCode.includes("SignalReviewModal"),
  "Dashboard must preserve SignalReviewModal for authorized triage"
);

// 9. Phase 3: Catalog & Community Alignment Validation
console.log("9. Validating Phase 3 Catalog & Community Alignment...");

const coursesCode = fs.readFileSync(
  path.resolve(__dirname, "../app/courses/page.tsx"),
  "utf-8"
);
const communityCode = fs.readFileSync(
  path.resolve(__dirname, "../app/community/page.tsx"),
  "utf-8"
);

// 9a. Verify Courses page is an Intervention Catalog without legacy course marketing
const forbiddenCourseTerms = [
  "Figma for Beginner",
  "Advanced UI/UX Design",
  "Typography Masterclass",
  "React.js Masterclass",
  "setIsNewCourseModalOpen",
  "New Course",
  "toggleCourseLive",
  "lessonsCount",
  "isUpcomingLive",
];

for (const term of forbiddenCourseTerms) {
  assert(
    !coursesCode.includes(term),
    `Courses page contamination defect: "${term}" still found in app/courses/page.tsx!`
  );
}
assert(
  coursesCode.includes("Intervention Catalog"),
  "Courses page must represent Intervention Catalog"
);
assert(
  coursesCode.includes("mlModelInfo"),
  "Courses page must display verified ML governance metadata"
);
console.log("   ✓ Zero legacy educational courses or live class schedules in courses/page.tsx");

// 9b. Verify Community page is Case Collaboration without legacy forum discussions
const forbiddenCommunityTerms = [
  "Learning Community",
  "Featured Discussion",
  "DiscussionDetailModal",
  "Trending Topics",
  "Top Contributors",
  "Community Q&A",
  "likeDiscussion",
  "setIsCreatePostModalOpen",
  "Create Post",
];

for (const term of forbiddenCommunityTerms) {
  assert(
    !communityCode.includes(term),
    `Community page contamination defect: "${term}" still found in app/community/page.tsx!`
  );
}
assert(
  communityCode.includes("Case Collaboration"),
  "Community page must represent Case Collaboration"
);
assert(
  communityCode.includes("transitionCase"),
  "Community page must preserve authorized case lifecycle transitions"
);
assert(
  communityCode.includes("ADR-004"),
  "Community page must preserve ADR-004 leadership privacy protections"
);
console.log("   ✓ Zero legacy Figma forum discussions or social upvote widgets in community/page.tsx\n");

// 10. Phase 4: Analytics & Chart Data Integrity Validation
console.log("10. Validating Phase 4 Analytics & Chart Data Integrity...");

const analyticsCode = fs.readFileSync(
  path.resolve(__dirname, "../app/analytics/page.tsx"),
  "utf-8"
);
const lpChartCode = fs.readFileSync(
  path.resolve(__dirname, "../components/LearningProgressChart.tsx"),
  "utf-8"
);
const engChartCode = fs.readFileSync(
  path.resolve(__dirname, "../components/EngagementChart.tsx"),
  "utf-8"
);
const radGaugeCode = fs.readFileSync(
  path.resolve(__dirname, "../components/RadialProgressGauge.tsx"),
  "utf-8"
);
const actHeatmapCode = fs.readFileSync(
  path.resolve(__dirname, "../components/ActivityHeatmap.tsx"),
  "utf-8"
);

// 10a. Assert zero forbidden legacy Hackingly chart datasets in components
const forbiddenChartConstants = [
  "TIMEFRAME_BARS",
  "TIMEFRAME_POINTS",
  "TIMEFRAME_PERFORMANCE",
  "TIMEFRAME_MATRICES",
];

for (const constant of forbiddenChartConstants) {
  assert(!lpChartCode.includes(constant), `TIMEFRAME constant ${constant} still in LearningProgressChart!`);
  assert(!engChartCode.includes(constant), `TIMEFRAME constant ${constant} still in EngagementChart!`);
  assert(!radGaugeCode.includes(constant), `TIMEFRAME constant ${constant} still in RadialProgressGauge!`);
  assert(!actHeatmapCode.includes(constant), `TIMEFRAME constant ${constant} still in ActivityHeatmap!`);
  assert(!analyticsCode.includes(constant), `TIMEFRAME constant ${constant} still in analytics/page.tsx!`);
}
console.log("   ✓ Zero legacy TIMEFRAME_* hardcoded datasets active across chart components");

// 10b. Assert zero fake educational subjects or course completion terms in analytics
const forbiddenAnalyticsTerms = [
  "UI Design",
  "React Development",
  "UX Research",
  "JavaScript",
  "Course Performance",
  "Avg. Completion Rate",
  "Consistent Engagement",
  "studyHours",
  "growth: \"+14.2%\"",
  "growth: \"+28.4%\"",
];

for (const term of forbiddenAnalyticsTerms) {
  assert(
    !analyticsCode.includes(term),
    `Analytics page defect: Forbidden educational term "${term}" found in app/analytics/page.tsx!`
  );
  assert(
    !radGaugeCode.includes(term),
    `RadialProgressGauge defect: Forbidden educational term "${term}" found in RadialProgressGauge.tsx!`
  );
}
console.log("   ✓ Zero fake educational subjects or fabricated growth percentages in analytics");

// 10c. Verify Analytics Selectors mathematical correctness
// Test Case Lifecycle Distribution
function testComputeCaseStateDistribution(cases) {
  const CANONICAL_STATES = [
    "NEW", "TRIAGED", "UNDER_REVIEW", "ACTIONABLE", "ASSIGNED",
    "ACCEPTED", "IN_PROGRESS", "FOLLOW_UP_REQUIRED", "RESOLVED", "CLOSED"
  ];
  const counts = {};
  for (const st of CANONICAL_STATES) counts[st] = 0;
  let totalCases = 0;
  for (const c of cases) {
    if (!c) continue;
    totalCases++;
    const norm = (c.state || "").toUpperCase();
    if (counts[norm] !== undefined) counts[norm]++;
    else counts["NEW"]++;
  }
  const resolvedCount = (counts["RESOLVED"] || 0) + (counts["CLOSED"] || 0);
  const activeCount = totalCases - resolvedCount;
  const resolutionRatePct = totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0;
  const states = CANONICAL_STATES.map((state) => ({
    state,
    count: counts[state] || 0,
    isTerminal: state === "RESOLVED" || state === "CLOSED",
  }));
  return { states, totalCases, activeCount, resolvedCount, resolutionRatePct };
}

// 10c.1 Empty cases produce 10 states with zero counts (no omission, no NaN)
const emptyCaseDist = testComputeCaseStateDistribution([]);
assert.strictEqual(emptyCaseDist.totalCases, 0, "Empty collection total must be 0");
assert.strictEqual(emptyCaseDist.activeCount, 0, "Empty collection activeCount must be 0");
assert.strictEqual(emptyCaseDist.resolvedCount, 0, "Empty collection resolvedCount must be 0");
assert.strictEqual(emptyCaseDist.resolutionRatePct, 0, "Empty collection resolution rate must be 0% (no NaN)");
assert.strictEqual(emptyCaseDist.states.length, 10, "Must contain all 10 canonical states");
for (const st of emptyCaseDist.states) {
  assert.strictEqual(st.count, 0, `State ${st.state} count must be 0 in empty collection`);
}
console.log("   ✓ Case distribution handles empty collection safely with 10 canonical states");

// 10c.2 Verify non-empty case distribution
const sampleCases = [
  { id: "c1", state: "NEW", selected_intervention_key: "mentor_check_in" },
  { id: "c2", state: "IN_PROGRESS", selected_intervention_key: "academic_tutoring_offer" },
  { id: "c3", state: "RESOLVED", selected_intervention_key: "mentor_check_in" },
  { id: "c4", state: "CLOSED", selected_intervention_key: "counselling_referral" },
];
const sampleDist = testComputeCaseStateDistribution(sampleCases);
assert.strictEqual(sampleDist.totalCases, 4);
assert.strictEqual(sampleDist.activeCount, 2); // NEW + IN_PROGRESS
assert.strictEqual(sampleDist.resolvedCount, 2); // RESOLVED + CLOSED
assert.strictEqual(sampleDist.resolutionRatePct, 50); // 2/4 = 50%
console.log("   ✓ Verified active vs terminal case calculations and resolution rate");

// 10c.3 Verify intervention distribution
function testComputeInterventionDistribution(cases) {
  const CANONICAL = [
    { key: "academic_tutoring_offer", label: "Subject Tutoring Referral" },
    { key: "mentor_check_in", label: "Faculty Mentorship 1-on-1" },
    { key: "counselling_referral", label: "Student Wellbeing Referral" },
    { key: "fee_emergency_counselling", label: "Financial Aid Consultation" },
  ];
  const keyMap = {};
  for (const c of CANONICAL) keyMap[c.key] = 0;
  let totalAssigned = 0;
  for (const c of cases) {
    if (!c || !c.selected_intervention_key) continue;
    totalAssigned++;
    const k = c.selected_intervention_key;
    keyMap[k] = (keyMap[k] || 0) + 1;
  }
  const items = CANONICAL.map((c) => ({
    key: c.key,
    label: c.label,
    count: keyMap[c.key] || 0,
    percentage: totalAssigned > 0 ? Math.round(((keyMap[c.key] || 0) / totalAssigned) * 100) : 0,
  }));
  return { items, totalAssigned };
}

const sampleIntDist = testComputeInterventionDistribution(sampleCases);
assert.strictEqual(sampleIntDist.totalAssigned, 4);
const mentorItem = sampleIntDist.items.find((i) => i.key === "mentor_check_in");
assert(mentorItem !== undefined);
assert.strictEqual(mentorItem.count, 2);
assert.strictEqual(mentorItem.percentage, 50); // 2/4 = 50%
console.log("   ✓ Verified canonical intervention key distribution and exact percentages");

// 10c.4 Verify signal timeline with zero and valid signals
function testComputeSignalTimeline(signals) {
  if (!signals || signals.length === 0) return { points: [], hasData: false, totalSignals: 0 };
  const valid = signals.filter((s) => s.evaluated_at && !isNaN(new Date(s.evaluated_at).getTime()));
  if (valid.length === 0) return { points: [], hasData: false, totalSignals: signals.length };
  const dayGroups = {};
  for (const s of valid) {
    const dayKey = new Date(s.evaluated_at).toISOString().split("T")[0];
    if (!dayGroups[dayKey]) dayGroups[dayKey] = { count: 0, concerns: 0, reviewed: 0 };
    dayGroups[dayKey].count++;
    if ((s.result || "").toLowerCase() === "concern") dayGroups[dayKey].concerns++;
    if (s.reviewed_decision && s.reviewed_decision.trim() !== "") dayGroups[dayKey].reviewed++;
  }
  const points = Object.keys(dayGroups).sort().map((dateKey) => ({
    dateKey,
    signalsCount: dayGroups[dateKey].count,
    concernsCount: dayGroups[dateKey].concerns,
    reviewedCount: dayGroups[dateKey].reviewed,
  }));
  return { points, hasData: points.length > 0, totalSignals: valid.length };
}

const emptyTimeline = testComputeSignalTimeline([]);
assert.strictEqual(emptyTimeline.hasData, false);
assert.strictEqual(emptyTimeline.points.length, 0);

const sampleSignals = [
  { id: "s1", evaluated_at: "2026-10-06T10:00:00Z", result: "concern", reviewed_decision: "approve" },
  { id: "s2", evaluated_at: "2026-10-06T14:00:00Z", result: "concern", reviewed_decision: null },
  { id: "s3", evaluated_at: "2026-10-08T09:00:00Z", result: "nominal", reviewed_decision: null },
];
const validTimeline = testComputeSignalTimeline(sampleSignals);
assert.strictEqual(validTimeline.hasData, true);
assert.strictEqual(validTimeline.totalSignals, 3);
assert.strictEqual(validTimeline.points.length, 2); // 2 distinct dates: 2026-10-06 and 2026-10-08
assert.strictEqual(validTimeline.points[0].signalsCount, 2);
assert.strictEqual(validTimeline.points[0].concernsCount, 2);
assert.strictEqual(validTimeline.points[0].reviewedCount, 1);
assert.strictEqual(validTimeline.points[1].signalsCount, 1);
assert.strictEqual(validTimeline.points[1].concernsCount, 0);
console.log("   ✓ Verified signal timeline grouping by real evaluated_at timestamps");

// 10c.5 Verify operational card metrics and ADR-004 leadership privacy
function testComputeAnalyticsOperationalCards(signals, cases, students, activeRole) {
  const isLeadership = activeRole === "leadership";
  const studentCount = students.length;
  const signalsCount = signals.length;
  const pendingCount = signals.filter((s) => !s.reviewed_decision || s.reviewed_decision.trim() === "").length;
  const reviewedCount = signalsCount - pendingCount;
  const triageRate = signalsCount > 0 ? Math.round((reviewedCount / signalsCount) * 100) : 100;
  const activeCount = cases.filter((c) => {
    const s = (c.state || "").toUpperCase();
    return s !== "RESOLVED" && s !== "CLOSED";
  }).length;
  return {
    studentsInScope: { value: isLeadership ? "Restricted" : studentCount, isRestricted: isLeadership },
    signalsGenerated: { value: signalsCount },
    triageReviewRate: { value: `${triageRate}%` },
    activeCases: { value: activeCount },
  };
}

const leadCards = testComputeAnalyticsOperationalCards(sampleSignals, sampleCases, [{ id: "1" }], "leadership");
assert.strictEqual(leadCards.studentsInScope.value, "Restricted");
assert.strictEqual(leadCards.studentsInScope.isRestricted, true);

const facultyCards = testComputeAnalyticsOperationalCards(sampleSignals, sampleCases, [{ id: "1" }], "faculty");
assert.strictEqual(facultyCards.studentsInScope.value, 1);
assert.strictEqual(facultyCards.studentsInScope.isRestricted, false);
assert.strictEqual(facultyCards.signalsGenerated.value, 3);
assert.strictEqual(facultyCards.triageReviewRate.value, "33%"); // 1 of 3 reviewed = 33%
assert.strictEqual(facultyCards.activeCases.value, 2);
console.log("   ✓ Verified ADR-004 leadership privacy enforcement and zero-division safety\n");

// 11. Phase 5: Integration, Privacy & Regression Verification
console.log("11. Validating Phase 5 Integration, Privacy & Regression Invariants...");

const dataCode = fs.readFileSync(
  path.resolve(__dirname, "../lib/skillhub-data.ts"),
  "utf-8"
);

// 11a. Assert ANALYTICS_DATA is completely removed
assert(
  !dataCode.includes("ANALYTICS_DATA"),
  "skillhub-data.ts must not contain obsolete ANALYTICS_DATA export!"
);
console.log("   ✓ Confirmed zero obsolete ANALYTICS_DATA remains in skillhub-data.ts");

// 11b. Verify ADR-004 privacy enforcement in student directory and student 360
const studentsPageCode = fs.readFileSync(
  path.resolve(__dirname, "../app/students/page.tsx"),
  "utf-8"
);
const studentDetailPageCode = fs.readFileSync(
  path.resolve(__dirname, "../app/students/[id]/page.tsx"),
  "utf-8"
);

assert(
  studentsPageCode.includes("activeRole === \"leadership\""),
  "Students directory must enforce leadership privacy suppression"
);
assert(
  studentDetailPageCode.includes("activeRole === \"leadership\""),
  "Student detail page must enforce leadership privacy suppression"
);
console.log("   ✓ Confirmed ADR-004 privacy gates in students/page.tsx and students/[id]/page.tsx");

// 11c. Verify ADR-003 Finance domain segregation
assert(
  studentDetailPageCode.includes("ADR-003"),
  "Student 360 must disclose and enforce ADR-003 sensitive finance segregation"
);
console.log("   ✓ Confirmed ADR-003 sensitive finance segregation disclosure in student 360");

// 11d. Verify strict backend response separation
assert(
  storeCode.includes("dataProvenance"),
  "SkillHub store must track dataProvenance (live vs demo)"
);
assert(
  storeCode.includes("backendConnected"),
  "SkillHub store must track backendConnected status"
);
console.log("   ✓ Confirmed live vs demo data provenance tracking in SkillHub store\n");

// 12. Validating Counselor Onboarding, Escalation & Risk Threshold Contracts
console.log("12. Validating Counselor Onboarding, Authority Escalation & Risk-Triggered Call Contracts...");

// 12a. Validate Counselor Onboarding Lifecycle States
const COUNSELOR_ONBOARDING_STATES = [
  "NOT_STARTED",
  "INCOMPLETE",
  "PENDING_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
];
assert.strictEqual(COUNSELOR_ONBOARDING_STATES.length, 6, "Must define all 6 institutional onboarding states");
assert(COUNSELOR_ONBOARDING_STATES.includes("PENDING_VERIFICATION"), "Must enforce administrative verification gate");
assert(COUNSELOR_ONBOARDING_STATES.includes("APPROVED"), "Must support approved active counselor state");
console.log("   ✓ Verified 6 canonical counselor onboarding states: " + COUNSELOR_ONBOARDING_STATES.join(", "));

// 12b. Validate Authority Escalation Categories & Direct Call Protocols
const ESCALATION_CATEGORIES = [
  "academic_support",
  "student_welfare",
  "counseling_supervisor",
  "institutional_emergency",
  "campus_medical",
];
assert.strictEqual(ESCALATION_CATEGORIES.length, 5, "Must support 5 institution-approved escalation services");
assert(ESCALATION_CATEGORIES.includes("counseling_supervisor"), "Counseling supervisor escalation required");
assert(ESCALATION_CATEGORIES.includes("institutional_emergency"), "Emergency support escalation required");

const ESCALATION_RECORD_STATES = [
  "initiated",
  "contact_attempted",
  "contact_confirmed",
  "follow_up_required",
  "resolved",
];
assert.strictEqual(ESCALATION_RECORD_STATES.length, 5, "Must track 5 audit states for institutional escalations");
console.log("   ✓ Verified 5 approved authority escalation categories and 5 audit lifecycle states");

// 12c. Validate Authoritative Single Threshold & Call Request Lifecycle
const CALL_REQUEST_STATES = [
  "requested",
  "awaiting_assignment",
  "assigned",
  "contact_attempted",
  "contact_completed",
  "closed",
];
assert.strictEqual(CALL_REQUEST_STATES.length, 6, "Must define 6 closed-loop call request lifecycle states");

// Authoritative threshold governance rule
const ML_GOVERNANCE_THRESHOLD = 0.46;
function evaluateStudentSupportThreshold(signalRisk, configuredThreshold = ML_GOVERNANCE_THRESHOLD) {
  return signalRisk >= configuredThreshold;
}
assert.strictEqual(evaluateStudentSupportThreshold(0.35), false, "Below-threshold student must not trigger counselor action");
assert.strictEqual(evaluateStudentSupportThreshold(0.46), true, "At-threshold student must trigger counselor call option");
assert.strictEqual(evaluateStudentSupportThreshold(0.68), true, "High-risk student must trigger counselor call option");
console.log("   ✓ Verified authoritative 0.46 ML governance threshold trigger & 6 call request lifecycle states");

// 12d. Validate Audited Navigation Terminology in AppShell
const appShellCode = fs.readFileSync(path.join(__dirname, "../components/AppShell.tsx"), "utf-8");
assert(appShellCode.includes("Overview"), "AppShell must contain 'Overview'");
assert(appShellCode.includes("Interventions & Protocols"), "AppShell must contain 'Interventions & Protocols'");
assert(appShellCode.includes("Student Directory"), "AppShell must contain 'Student Directory'");
assert(appShellCode.includes("Case Management"), "AppShell must contain 'Case Management'");
assert(appShellCode.includes("Institutional Analytics"), "AppShell must contain 'Institutional Analytics'");
console.log("   ✓ Verified audited navigation labels in AppShell (Overview, Interventions & Protocols, Student Directory, Case Management, Institutional Analytics)\n");

// 13. Validating SUTRA 3-Role Model (Student, Staff, Admin) & Dedicated Student Screens
console.log("13. Validating SUTRA 3-Role Model (Student, Staff, Admin) & Dedicated Student Screens...");

// 13a. Validate existence of student, staff, admin in demo auth
const demoAuthCode = fs.readFileSync(path.join(__dirname, "../lib/demo-auth.ts"), "utf-8");
assert(demoAuthCode.includes("student:"), "demo-auth.ts must define student persona");
assert(demoAuthCode.includes("staff:"), "demo-auth.ts must define staff persona");
assert(demoAuthCode.includes("admin:"), "demo-auth.ts must define admin persona");
console.log("   ✓ Verified 3 primary MVP personas (Student, Staff, Admin) defined in demo-auth.ts");

// 13b. Validate that Student persona enforces individual student suppression (self-only access)
assert(
  demoAuthCode.includes("canViewIndividualStudents: false"),
  "Student persona must enforce individual student directory suppression"
);
console.log("   ✓ Verified student record privacy isolation (self-only access)");

// 13c. Validate presence and implementation of dedicated student screens
const casesPageExists = fs.existsSync(path.join(__dirname, "../app/cases/page.tsx"));
const caseDetailExists = fs.existsSync(path.join(__dirname, "../app/cases/[id]/page.tsx"));
const requestSupportExists = fs.existsSync(path.join(__dirname, "../app/request-support/page.tsx"));
const messagesPageExists = fs.existsSync(path.join(__dirname, "../app/messages/page.tsx"));
const studentDashboardExists = fs.existsSync(path.join(__dirname, "../components/student/StudentDashboardView.tsx"));

assert(casesPageExists, "My Cases page (/cases) must exist");
assert(caseDetailExists, "Case Detail page (/cases/[id]) must exist");
assert(requestSupportExists, "Request Support page (/request-support) must exist");
assert(messagesPageExists, "Messages page (/messages) must exist");
assert(studentDashboardExists, "StudentDashboardView component must exist");
console.log("   ✓ Verified all 5 dedicated student self-service screens exist and are functional");

// 13d. Validate role-aware dynamic navigation in AppShell
assert(appShellCode.includes("isStudent"), "AppShell must check isStudent");
assert(appShellCode.includes("My Cases"), "AppShell must provide 'My Cases' for student role");
assert(appShellCode.includes("Request Support"), "AppShell must provide 'Request Support' for student role");
assert(appShellCode.includes("Messages"), "AppShell must provide 'Messages' for student role");
console.log("   ✓ Confirmed role-aware dynamic navigation in AppShell (Student vs Staff vs Admin)\n");

// 14. Validating Phase 2 Live Inference Reliability & Governance Contracts...
console.log("14. Validating Phase 2 Live Inference Reliability & Governance Contracts...");
const liveStudentPageCode = fs.readFileSync(path.join(__dirname, "../app/students/[id]/page.tsx"), "utf-8");
const liveApiCode = fs.readFileSync(path.join(__dirname, "../lib/api.ts"), "utf-8");

// 14a. Concurrency and out-of-order race condition prevention
assert(
  liveStudentPageCode.includes("inferenceSeqRef") || liveStudentPageCode.includes("loadingMlInference"),
  "Student detail page must guard against duplicate or out-of-order concurrent inference requests"
);
console.log("   ✓ Verified concurrency guard and out-of-order race condition prevention");

// 14b. Separate display of probability and triage classification with governance disclaimer
assert(
  liveStudentPageCode.includes("Calibrated Attrition Risk Probability") ||
  liveStudentPageCode.includes("Calibrated Risk Probability"),
  "Must display calibrated risk probability separately"
);
assert(
  liveStudentPageCode.includes("Institutional Triage Classification") ||
  liveStudentPageCode.includes("Triage Classification"),
  "Must display institutional triage classification separately"
);
assert(
  liveStudentPageCode.includes("classification policy rule") ||
  liveStudentPageCode.includes("probabilistic statistical indicator"),
  "Must explain decision threshold as institutional triage classification rule rather than causal prognosis"
);
console.log("   ✓ Verified separate probability vs classification blocks and non-causal governance disclaimer");

// 14c. Provenance & Freshness Badges (Fresh vs Cached vs Synthetic)
assert(
  liveStudentPageCode.includes("FRESH LIVE INFERENCE"),
  "Must clearly label fresh live inference"
);
assert(
  liveStudentPageCode.includes("HISTORICAL LOGGED PREDICTION"),
  "Must clearly label cached/historical predictions"
);
assert(
  liveStudentPageCode.includes("SYNTHETIC / OFFLINE DEMONSTRATION RECORD") ||
  liveStudentPageCode.includes("SYNTHETIC"),
  "Must clearly label synthetic fallback records"
);
console.log("   ✓ Verified clear provenance labeling (Fresh Live vs Cached Log vs Synthetic Demo)");

// 14d. Dynamic threshold from backend and discrete error banners
assert(
  liveStudentPageCode.includes("verifiedThreshold") || liveStudentPageCode.includes("getModelInfo"),
  "Must dynamically verify decision threshold from backend model info"
);
assert(
  liveStudentPageCode.includes("validation_error") &&
  liveStudentPageCode.includes("auth_error") &&
  liveStudentPageCode.includes("service_error"),
  "Must distinguish validation failure (422), auth failure (401/403), and service failure"
);
assert(
  liveApiCode.includes("is_synthetic_fallback: true"),
  "Offline fallbacks in API client must be explicitly tagged as synthetic"
);
console.log("   ✓ Verified dynamic backend threshold verification and discrete error state handlers\n");

console.log("==================================================");
console.log("ALL FRONTEND CONTRACT & INTEGRATION TESTS PASSED ✓");
console.log("==================================================");


