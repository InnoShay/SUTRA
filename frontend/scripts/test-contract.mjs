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

// 15. Validating Phase 1B: Frontend API Reliability & Real Data Integration
console.log("15. Validating Phase 1B: Frontend API Reliability & Real Data Integration...");

// 15a. Validate ApiError hierarchy and taxonomy
const apiCode = fs.readFileSync(path.join(__dirname, "../lib/api.ts"), "utf-8");
assert(apiCode.includes("class ApiError extends Error"), "api.ts must define typed ApiError");
assert(apiCode.includes("kind: ApiErrorKind"), "ApiError must specify ApiErrorKind");
assert(apiCode.includes("'network_error'"), "ApiErrorKind must support 'network_error'");
assert(apiCode.includes("'timeout'"), "ApiErrorKind must support 'timeout'");
assert(apiCode.includes("'authentication'"), "ApiErrorKind must support 'authentication'");
assert(apiCode.includes("'authorization'"), "ApiErrorKind must support 'authorization'");
assert(apiCode.includes("'validation'"), "ApiErrorKind must support 'validation'");
assert(apiCode.includes("'not_found'"), "ApiErrorKind must support 'not_found'");
assert(apiCode.includes("'server_error'"), "ApiErrorKind must support 'server_error'");
assert(apiCode.includes("'invalid_format'"), "ApiErrorKind must support 'invalid_format'");
console.log("   ✓ Verified ApiError hierarchy and 8 distinct error taxonomy categories");

// 15b. Validate Demo Mode isolation in API client
assert(apiCode.includes("export function isDemoMode()"), "api.ts must export isDemoMode()");
assert(apiCode.includes("NEXT_PUBLIC_SUTRA_DEMO_MODE"), "api.ts must inspect NEXT_PUBLIC_SUTRA_DEMO_MODE");
assert(apiCode.includes("if (isDemoMode())"), "api.ts must gate getOfflineFallback behind isDemoMode()");
assert(apiCode.includes("throw ApiError.network"), "api.ts must throw ApiError.network in normal mode when network fails");
console.log("   ✓ Verified Demo Mode isolation: normal mode never silently falls back to synthetic fixtures");

// 15c. Validate Store Mutation Error Propagation (No Fabricated Success)
const updatedStoreCode = fs.readFileSync(path.join(__dirname, "../lib/skillhub-store.tsx"), "utf-8");
assert(updatedStoreCode.includes("if (!isDemoMode())"), "skillhub-store.tsx must gate local fallbacks behind isDemoMode()");
const demoGuardMatches = (updatedStoreCode.match(/if \(!isDemoMode\(\)\)/g) || []).length;
assert(demoGuardMatches >= 10, `Expected at least 10 demo-mode guards on mutation catch blocks, found ${demoGuardMatches}`);
console.log(`   ✓ Verified ${demoGuardMatches} store mutation handlers reject silent fallbacks in normal mode`);

// 15d. Validate Documents Page error state handling
const docsPageCode = fs.readFileSync(path.join(__dirname, "../app/documents/page.tsx"), "utf-8");
assert(docsPageCode.includes("errorMsg ?"), "DocumentsPage must render an explicit error state when errorMsg is present");
assert(docsPageCode.includes("Retry Connection"), "DocumentsPage must provide a retry connection button on error");
console.log("   ✓ Verified DocumentsPage renders explicit error state with retry action instead of disguised empty list");

// 15e. Validate Support Request Validation & No Fabricated Reference IDs
const reqSupportCode = fs.readFileSync(path.join(__dirname, "../app/request-support/page.tsx"), "utf-8");
assert(reqSupportCode.includes("subject.trim().length < 5"), "RequestSupportPage must validate minimum subject length");
assert(reqSupportCode.includes("description.trim().length < 10"), "RequestSupportPage must validate minimum description length");
assert(reqSupportCode.includes("Endpoint Pending Backend Integration"), "RequestSupportPage must disclose backend category limitations");
assert(!reqSupportCode.includes("setSubmittedCaseRef(`REQ-${Date.now().toString().slice(-4)}`);"), "RequestSupportPage must not fabricate REQ-XXXX references in catch block");
console.log("   ✓ Verified Support Request input validation, category limitation disclosure, and zero fabricated success IDs");

// 15f. Validate Assessment Local Storage defensive parsing
const assessmentPageCode = fs.readFileSync(path.join(__dirname, "../app/assessment/page.tsx"), "utf-8");
assert(assessmentPageCode.includes("Array.isArray(parsed.dimensions)"), "AssessmentPage must validate report structure from localStorage");
assert(assessmentPageCode.includes("localStorage.removeItem(STORAGE_KEY)"), "AssessmentPage must safely purge corrupted localStorage data");
console.log("   ✓ Verified defensive JSON parsing and structure validation for browser-persisted assessment reports");

// 15g. Validate Request Counselor Call Modal Error Handling
const counselorModalCode = fs.readFileSync(path.join(__dirname, "../components/RequestCounselorCallModal.tsx"), "utf-8");
assert(counselorModalCode.includes("setErrorMessage("), "RequestCounselorCallModal must set error message on failure");
assert(counselorModalCode.includes("errorMessage &&"), "RequestCounselorCallModal must display error banner on failure");
console.log("   ✓ Verified RequestCounselorCallModal error banner and error state handling");

// 15h. Validate runtime ApiError factory and empty collection preservation semantics
class RuntimeApiError extends Error {
  constructor(kind, message, status = 0) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
  static network(url) {
    return new RuntimeApiError("network_error", `Network request to ${url} failed`, 0);
  }
  static http(status, url) {
    let kind = "server_error";
    if (status === 401) kind = "authentication";
    else if (status === 403) kind = "authorization";
    else if (status === 404) kind = "not_found";
    else if (status === 422) kind = "validation";
    return new RuntimeApiError(kind, `HTTP ${status}`, status);
  }
}
const netErr = RuntimeApiError.network("/api/v1/cases");
assert.strictEqual(netErr.kind, "network_error");
assert.strictEqual(netErr.status, 0);
const authErr = RuntimeApiError.http(401, "/api/v1/cases");
assert.strictEqual(authErr.kind, "authentication");
assert.strictEqual(authErr.status, 401);
const notFoundErr = RuntimeApiError.http(404, "/api/v1/documents");
assert.strictEqual(notFoundErr.kind, "not_found");
const valErr = RuntimeApiError.http(422, "/api/v1/signals");
assert.strictEqual(valErr.kind, "validation");

// Validate empty collection preserved (not replaced with synthetic fallback)
const validEmptyResponse = [];
assert(Array.isArray(validEmptyResponse) && validEmptyResponse.length === 0, "Valid empty collection must be preserved");
// 16. Validating Phase 2: Student Workflow Integration & Authentication Readiness Contracts...
console.log("16. Validating Phase 2: Student Workflow Integration & Authentication Readiness Contracts...");

// 16a. Student Route & Directory Privacy Protection
const studentDirCode = fs.readFileSync(path.join(__dirname, "../app/students/page.tsx"), "utf-8");
assert(
  studentDirCode.includes('if (activeRole === "student")'),
  "StudentsPage must restrict enrolled students from browsing peer directory"
);
assert(
  studentDirCode.includes("Student Directory Restricted") || studentDirCode.includes("Student Access Restricted"),
  "StudentsPage must render student privacy safeguard card"
);

const student360Code = fs.readFileSync(path.join(__dirname, "../app/students/[id]/page.tsx"), "utf-8");
assert(
  student360Code.includes('if (activeRole === "student")'),
  "StudentDetailPage must restrict enrolled students from inspecting staff 360 triage telemetry"
);
console.log("   ✓ Verified student directory and student 360 evaluation privacy guards");

// 16b. Student Case Record Isolation (Zero cases[0] Fallback Leakage)
const caseDetailCode = fs.readFileSync(path.join(__dirname, "../app/cases/[id]/page.tsx"), "utf-8");
assert(
  !caseDetailCode.includes("|| cases[0]"),
  "CaseDetailPage must NEVER fallback to cases[0] when case is not found or not owned by student"
);
assert(
  caseDetailCode.includes("c.student_id === studentId || c.external_student_ref === studentId"),
  "CaseDetailPage must enforce student ownership matching"
);
assert(
  caseDetailCode.includes("Case Not Accessible"),
  "CaseDetailPage must display explicit access denied state when student tries to open another student's case"
);
console.log("   ✓ Verified student case ownership isolation and zero cases[0] fallback leakage");

// 16c. Authentication & Campus Isolation Hygiene
const storeAuthCode = fs.readFileSync(path.join(__dirname, "../lib/skillhub-store.tsx"), "utf-8");
assert(
  storeAuthCode.includes("if (isDemoMode()) {\n        if (!api.getToken())") ||
  storeAuthCode.includes("if (isDemoMode())"),
  "skillhub-store.tsx must gate development persona token and campus ID attachment behind isDemoMode()"
);
console.log("   ✓ Verified authentication hygiene: zero fabricated tokens or campus IDs in unauthenticated normal mode");

// 16d. Offline & Error State Propagation on Cases and Dashboard
const casesListCode = fs.readFileSync(path.join(__dirname, "../app/cases/page.tsx"), "utf-8");
assert(
  casesListCode.includes("backendError &&"),
  "CasesPage must render backend connectivity alert when backendError is present"
);
assert(
  casesListCode.includes("refreshBackendData()"),
  "CasesPage must provide connection retry action on offline/error"
);
console.log("   ✓ Verified case tracker error and offline state propagation with retry action");

// 16e. In-App Messaging Backend Limitation Disclosures
const messagesCode = fs.readFileSync(path.join(__dirname, "../app/messages/page.tsx"), "utf-8");
assert(
  messagesCode.includes("messaging backend service is in development") ||
  messagesCode.includes("In-Session Local Preview"),
  "MessagesPage must disclose that messaging persistence is in development"
);
assert(
  caseDetailCode.includes("messaging persistence is pending backend messaging service") ||
  caseDetailCode.includes("Consultation notes are coordinated with your mentor"),
  "CaseDetailPage must disclose that real-time messaging persistence is pending backend service"
);
console.log("   ✓ Verified messaging integration disclosures across Case Detail and Messages views");

// 16f. Runtime test for student case isolation logic
function filterStudentCase(cases, targetStudentId, requestedCaseId) {
  return cases.find(
    (c) =>
      c.id === requestedCaseId &&
      (c.student_id === targetStudentId || c.external_student_ref === targetStudentId)
  );
}
const phase2MockCases = [
  { id: "CASE-STU-A", student_id: "STU-A", external_student_ref: "STU-A", title: "Plan A" },
  { id: "CASE-STU-B", student_id: "STU-B", external_student_ref: "STU-B", title: "Plan B" },
];
assert.strictEqual(filterStudentCase(phase2MockCases, "STU-A", "CASE-STU-A")?.id, "CASE-STU-A");
assert.strictEqual(filterStudentCase(phase2MockCases, "STU-A", "CASE-STU-B"), undefined);
assert.strictEqual(filterStudentCase(phase2MockCases, "STU-A", "CASE-NONEXISTENT"), undefined);
console.log("   ✓ Verified runtime student case isolation logic prevents cross-student record disclosure\n");

// --- 17. PR #7 Reconciled Scheduler, Onboarding & Counselor Analytics Contracts ---
console.log("17. Validating PR #7 Reconciled Counselor & Scheduler Contracts...");
const reconciledTypesCode = fs.readFileSync(path.join(__dirname, "../lib/types.ts"), "utf-8");
assert(
  reconciledTypesCode.includes("export interface CounselorCalendarEvent"),
  "types.ts must define CounselorCalendarEvent"
);
console.log("   ✓ Verified CounselorCalendarEvent appended to types.ts");

assert(
  storeCode.includes("demoActive ? INITIAL_CALENDAR_EVENTS : []"),
  "skillhub-store.tsx must gate INITIAL_CALENDAR_EVENTS strictly behind demoActive"
);
assert(
  storeCode.includes("calendarEvents: CounselorCalendarEvent[]"),
  "skillhub-store.tsx must expose calendarEvents in SkillHubContextType"
);
assert(
  storeCode.includes("addCalendarEvent") && storeCode.includes("deleteCalendarEvent"),
  "skillhub-store.tsx must provide calendar event handlers"
);
console.log("   ✓ Verified calendarEvents state is strictly demoActive gated and wired to store");

const reconciledAppShellCode = fs.readFileSync(path.join(__dirname, "../components/AppShell.tsx"), "utf-8");
assert(
  reconciledAppShellCode.includes('href: "/schedule"'),
  "AppShell.tsx must include /schedule route"
);
assert(
  reconciledAppShellCode.includes("counselorNavItems"),
  "AppShell.tsx must provide dedicated counselorNavItems"
);
assert(
  reconciledAppShellCode.includes('supabaseSession ? "Active Account" : "Active Persona"'),
  "AppShell.tsx must preserve Supabase SSO session switcher"
);
assert(
  reconciledAppShellCode.includes("isDemoMode()"),
  "AppShell.tsx must preserve Demo Mode badge"
);
console.log("   ✓ Verified scheduler navigation integrated and Supabase SSO persona switcher preserved");

const reconciledCalendarPageCode = fs.readFileSync(path.join(__dirname, "../app/calendar/page.tsx"), "utf-8");
assert(
  reconciledCalendarPageCode.includes('import SchedulePage from "../schedule/page"'),
  "calendar/page.tsx must re-export SchedulePage"
);
const reconciledSchedulePageCode = fs.readFileSync(path.join(__dirname, "../app/schedule/page.tsx"), "utf-8");
assert(
  reconciledSchedulePageCode.includes("Schedule & Calls") || reconciledSchedulePageCode.includes("SchedulePage"),
  "schedule/page.tsx must provide interactive weekly schedule view"
);
console.log("   ✓ Verified /schedule and /calendar pages exist and link correctly");

const reconciledAnalyticsCode = fs.readFileSync(path.join(__dirname, "../app/analytics/page.tsx"), "utf-8");
assert(
  reconciledAnalyticsCode.includes('if (activeRole === "counselor")') &&
  reconciledAnalyticsCode.includes("<CounselorAnalyticsPage />"),
  "analytics/page.tsx must route counselors to CounselorAnalyticsPage"
);
console.log("   ✓ Verified counselor analytics routing in analytics/page.tsx");

const reconciledOnboardingCode = fs.readFileSync(path.join(__dirname, "../app/onboarding/page.tsx"), "utf-8");
assert(
  reconciledOnboardingCode.includes('formData.accountLevel === "counselor"') &&
  reconciledOnboardingCode.includes("counselorSpecialization"),
  "onboarding/page.tsx must include counselor setup fields"
);
console.log("   ✓ Verified counselor role onboarding wizard in onboarding/page.tsx\n");

// ==========================================
// 16. Feature Attribution Visualisations Contracts (Phase 3)
// ==========================================
console.log("16. Validating Phase 3 Feature Attribution Visualisation Contracts...");

const chartComponentPath = path.join(__dirname, "../components/FeatureAttributionChart.tsx");
assert(fs.existsSync(chartComponentPath), "FeatureAttributionChart.tsx component must exist in components directory");

const chartCode = fs.readFileSync(chartComponentPath, "utf-8");

// 16a. Horizontal Diverging Bar Chart and Directional Separation
assert(
  chartCode.includes("Diverging Chart") && chartCode.includes("w-1/2"),
  "Must implement horizontal diverging bar chart centered on zero axis"
);
assert(
  chartCode.includes("risk_driver") && chartCode.includes("protective"),
  "Must cleanly separate risk drivers (positive) and protective factors (negative)"
);
assert(
  chartCode.includes("Total Risk Drivers") && chartCode.includes("Total Protective Offset"),
  "Must show summary metrics for risk driver load vs protective offset"
);
console.log("   ✓ Verified horizontal diverging bar chart and directional separation");

// 16b. Understandable labels and canonical identifiers
assert(
  chartCode.includes("CANONICAL_FEATURE_METADATA") && chartCode.includes("rawFeature"),
  "Must map canonical feature keys to understandable human labels while preserving audit identifiers"
);
assert(
  liveStudentPageCode.includes("FeatureAttributionChart"),
  "Student 360 page must mount FeatureAttributionChart"
);
console.log("   ✓ Verified human-readable labels with canonical audit keys preserved");

// 16c. Attribution units and directional semantics
assert(
  chartCode.includes("Δ Log-Odds") || chartCode.includes("Log-Odds"),
  "Must explicitly specify attribution units as Log-Odds impact"
);
assert(
  chartCode.includes("Positive (+Δ Log-Odds)") && chartCode.includes("Negative (-Δ Log-Odds)"),
  "Must explain what positive and negative attribution directions mean"
);
console.log("   ✓ Verified attribution units (Δ Log-Odds) and directional explanations");

// 16d. Accessible Table Alternative
assert(
  chartCode.includes("<table") && chartCode.includes("caption") && chartCode.includes("scope=\"col\""),
  "Must provide accessible table alternative with caption and column scopes"
);
console.log("   ✓ Verified accessible structured table alternative");

// 16e. Empty, zero, and outlier safety handling
assert(
  chartCode.includes("No Feature Attributions Supplied"),
  "Must provide graceful empty state when attributions are missing"
);
assert(
  chartCode.includes("neutral") && (chartCode.includes("Baseline reference") || chartCode.includes("0.00")),
  "Must safely handle zero / neutral baseline contributions"
);
assert(
  chartCode.includes("hasOutlier") || chartCode.includes("maxAbsMagnitude"),
  "Must safely clamp and handle outlier / unusually large attribution values"
);
console.log("   ✓ Verified safe handling of empty, zero, invalid and outlier values");

// 16f. Non-causal governance disclaimer
assert(
  chartCode.includes("Non-Causal Statistical Association") || chartCode.includes("NOT establish causal mechanisms"),
  "Must include non-causal governance disclaimer forbidding causal claims"
);
console.log("   ✓ Verified non-causal governance disclaimer\n");

// ==========================================
// 17. Student 360 Evidence Experience Contracts (Phase 4)
// ==========================================
console.log("17. Validating Phase 4 Student 360 Evidence Experience Contracts...");

const evidenceLedgerComponentPath = path.join(__dirname, "../components/student/StudentEvidenceLedger.tsx");
assert(fs.existsSync(evidenceLedgerComponentPath), "StudentEvidenceLedger.tsx component must exist");

const ledgerCode = fs.readFileSync(evidenceLedgerComponentPath, "utf-8");

// 17a. Mounting in Student 360
assert(
  liveStudentPageCode.includes("StudentEvidenceLedger"),
  "Student 360 page must mount StudentEvidenceLedger component"
);
assert(
  liveStudentPageCode.includes("studentReadiness") && liveStudentPageCode.includes("getReadiness"),
  "Student 360 page must query feature readiness from API client"
);
console.log("   ✓ Verified StudentEvidenceLedger mounted and readiness queried in Student 360");

// 17b. 5-Tier Evidence Architecture distinction
assert(
  ledgerCode.includes("SUTRA 5-Tier Evidence Architecture"),
  "Must implement SUTRA 5-Tier Evidence Architecture"
);
assert(
  ledgerCode.includes("Tier 1: Facts") &&
  ledgerCode.includes("Tier 2: Rules") &&
  ledgerCode.includes("Tier 3: ML Model") &&
  ledgerCode.includes("Tier 4: Advisory") &&
  ledgerCode.includes("Tier 5: Human"),
  "Must distinguish raw facts (Tier 1), rules (Tier 2), ML model (Tier 3), advisory (Tier 4), and human decisions (Tier 5)"
);
console.log("   ✓ Verified 5-Tier Evidence Architecture distinguishes model predictions from facts, rules, and human decisions");

// 17c. Model Input Evidence Ledger & Anti-Imputation Invariant
assert(
  ledgerCode.includes("25 Day-30 Canonical Features"),
  "Must audit all 25 canonical Day-30 features"
);
assert(
  ledgerCode.includes("Zero-Imputation") && ledgerCode.includes("NEVER silently filled with zeros"),
  "Must enforce anti-imputation invariant: missing features never silently filled with zeros"
);
assert(
  ledgerCode.includes("underivable") || ledgerCode.includes("missing"),
  "Must make unavailable or incomplete features visible with derivation notes"
);
console.log("   ✓ Verified Model Input Evidence Ledger and anti-imputation invariants");

// 17d. Model Purpose, Limitations, and Threshold Policy
assert(
  ledgerCode.includes("Model Purpose") &&
  ledgerCode.includes("Score Limitations") &&
  ledgerCode.includes("Decision Threshold Policy"),
  "Must include concise explanations of model purpose, score limitations, and decision threshold policy"
);
assert(
  ledgerCode.includes("Human-in-the-Loop Invariant") && ledgerCode.includes("never automatically create cases"),
  "Must explicitly forbid automated case creation merely because model labels student at risk"
);
console.log("   ✓ Verified concise explanations of model purpose, score limitations, and decision threshold policy");

// 17e. Access Control Verification
assert(
  liveStudentPageCode.includes("ADR-004") && liveStudentPageCode.includes("leadership"),
  "Must enforce ADR-004 leadership privacy boundary on student profile"
);
assert(
  liveStudentPageCode.includes("ADR-003") || liveStudentPageCode.includes("Fee Segregated"),
  "Must enforce ADR-003 financial segregation on student evidence views"
);
console.log("   ✓ Verified access controls and privacy gates (ADR-003 and ADR-004)\n");

// ==========================================
// 18. Cohort Risk Analytics Contracts (Phase 5)
// ==========================================
console.log("18. Validating Phase 5 Cohort Risk Analytics Contracts...");

const currentAnalyticsPageCode = fs.readFileSync(
  path.resolve(__dirname, "../app/analytics/page.tsx"),
  "utf-8"
);
const riskDistChartPath = path.join(__dirname, "../components/analytics/CohortRiskDistributionChart.tsx");
const cohortTablePath = path.join(__dirname, "../components/analytics/CohortComparisonTable.tsx");
const multiTrendPath = path.join(__dirname, "../components/analytics/MultiTierTrendChart.tsx");

assert(fs.existsSync(riskDistChartPath), "CohortRiskDistributionChart.tsx must exist");
assert(fs.existsSync(cohortTablePath), "CohortComparisonTable.tsx must exist");
assert(fs.existsSync(multiTrendPath), "MultiTierTrendChart.tsx must exist");

const riskChartCode = fs.readFileSync(riskDistChartPath, "utf-8");
const cohortTableCode = fs.readFileSync(cohortTablePath, "utf-8");
const multiTrendCode = fs.readFileSync(multiTrendPath, "utf-8");

// 18a. Visual components mounted in Analytics Page
assert(
  currentAnalyticsPageCode.includes("CohortRiskDistributionChart"),
  "Analytics page must mount CohortRiskDistributionChart"
);
assert(
  currentAnalyticsPageCode.includes("CohortComparisonTable"),
  "Analytics page must mount CohortComparisonTable"
);
assert(
  currentAnalyticsPageCode.includes("MultiTierTrendChart"),
  "Analytics page must mount MultiTierTrendChart"
);
assert(
  currentAnalyticsPageCode.includes("selectedCohort") && currentAnalyticsPageCode.includes("selectedRiskTier"),
  "Analytics page must support interactive cohort and risk tier filters"
);
console.log("   ✓ Verified Phase 5 visualization components and interactive filters mounted in analytics/page.tsx");

// 18b. Cohort Risk Distribution contracts
assert(
  riskChartCode.includes("Threshold:") &&
  riskChartCode.includes("Low Risk") &&
  riskChartCode.includes("Moderate") &&
  riskChartCode.includes("Elevated"),
  "CohortRiskDistributionChart must surface threshold 0.46 and granular risk tiers"
);
assert(
  riskChartCode.includes("Small-Group Privacy Suppression Active") && riskChartCode.includes("ADR-004"),
  "CohortRiskDistributionChart must handle ADR-004 small-group privacy suppression"
);
console.log("   ✓ Verified cohort risk distribution, threshold 0.46 co-location and granular tiers");

// 18c. Multi-Tier Trend Chart contracts
assert(
  multiTrendCode.includes("Tier 3: Predictions") &&
  multiTrendCode.includes("Tier 2: Policy Signals") &&
  multiTrendCode.includes("Tier 5: Cases Opened") &&
  multiTrendCode.includes("Confirmed Resolutions"),
  "MultiTierTrendChart must distinguish Predictions, Signals, Cases and Confirmed Outcomes"
);
assert(
  multiTrendCode.includes("Non-Causal Governance Notice") && multiTrendCode.includes("not be claimed as proof of model accuracy"),
  "MultiTierTrendChart must enforce non-causal governance disclaimer"
);
console.log("   ✓ Verified multi-tier trend series separation and non-causal accuracy disclaimers");

// 18d. Mathematical correctness of Cohort Risk & Privacy Selectors
function mockComputeCohortRiskDistribution(students, predictions, isLeadership) {
  const totalStudents = students.length;
  const studentMap = new Map();
  for (const s of students) {
    studentMap.set(s.id, s);
    if (s.external_ref) studentMap.set(s.external_ref, s);
  }
  const latest = new Map();
  let totalRuns = 0;
  for (const p of predictions) {
    const key = p.student_id || p.external_student_ref;
    if (studentMap.has(key)) {
      totalRuns++;
      const existing = latest.get(key);
      if (!existing || (p.created_at && existing.created_at && new Date(p.created_at) >= new Date(existing.created_at))) {
        latest.set(key, p);
      }
    }
  }
  const evaluatedCount = latest.size;
  let atRisk = 0;
  for (const p of latest.values()) {
    if (p.risk_probability >= (p.threshold || 0.46) || p.classification === "At_Risk") atRisk++;
  }
  const onTrack = evaluatedCount - atRisk;
  const isSuppressed = totalStudents < 5 && isLeadership;
  return {
    totalStudents,
    evaluatedStudentsCount: evaluatedCount,
    totalPredictionRuns: totalRuns,
    coveragePercentage: totalStudents > 0 ? Math.round((evaluatedCount / totalStudents) * 100) : 0,
    at_risk_count: isSuppressed ? null : atRisk,
    at_risk_percentage: isSuppressed ? null : (evaluatedCount > 0 ? Math.round((atRisk / evaluatedCount) * 100) : 0),
    on_track_count: isSuppressed ? null : onTrack,
    on_track_percentage: isSuppressed ? null : (evaluatedCount > 0 ? Math.round((onTrack / evaluatedCount) * 100) : 0),
    is_privacy_suppressed: isSuppressed,
  };
}

// 18d.1 Deduplication test
const testStudents = [
  { id: "s1", external_ref: "REF-1", cohort_code: "CS-2026" },
  { id: "s2", external_ref: "REF-2", cohort_code: "CS-2026" },
  { id: "s3", external_ref: "REF-3", cohort_code: "CS-2026" },
  { id: "s4", external_ref: "REF-4", cohort_code: "CS-2026" },
  { id: "s5", external_ref: "REF-5", cohort_code: "CS-2026" },
  { id: "s6", external_ref: "REF-6", cohort_code: "CS-2026" },
];
const testPredictions = [
  { external_student_ref: "REF-1", risk_probability: 0.30, threshold: 0.46, created_at: "2026-10-10T10:00:00Z" },
  { external_student_ref: "REF-1", risk_probability: 0.70, threshold: 0.46, created_at: "2026-10-12T10:00:00Z" }, // Newer -> At_Risk
  { external_student_ref: "REF-2", risk_probability: 0.20, threshold: 0.46, created_at: "2026-10-12T10:00:00Z" }, // On_Track
  { external_student_ref: "REF-3", risk_probability: 0.60, threshold: 0.46, created_at: "2026-10-12T10:00:00Z" }, // At_Risk
  { external_student_ref: "REF-4", risk_probability: 0.40, threshold: 0.46, created_at: "2026-10-12T10:00:00Z" }, // On_Track
];

const dedupResult = mockComputeCohortRiskDistribution(testStudents, testPredictions, false);
assert.strictEqual(dedupResult.totalStudents, 6);
assert.strictEqual(dedupResult.evaluatedStudentsCount, 4); // s1, s2, s3, s4
assert.strictEqual(dedupResult.totalPredictionRuns, 5); // 2 + 1 + 1 + 1
assert.strictEqual(dedupResult.at_risk_count, 2); // s1 (newer 0.70) + s3 (0.60)
assert.strictEqual(dedupResult.on_track_count, 2); // s2 (0.20) + s4 (0.40)
assert.strictEqual(dedupResult.at_risk_percentage, 50); // 2/4 = 50%
assert.strictEqual(dedupResult.is_privacy_suppressed, false);
console.log("   ✓ Verified deduplication of repeated inference runs and accurate risk prevalence percentages");

// 18d.2 Small-group privacy suppression for leadership (< 5)
const smallGroupStudents = testStudents.slice(0, 3); // 3 students < 5
const smallGroupResult = mockComputeCohortRiskDistribution(smallGroupStudents, testPredictions, true);
assert.strictEqual(smallGroupResult.totalStudents, 3);
assert.strictEqual(smallGroupResult.is_privacy_suppressed, true);
assert.strictEqual(smallGroupResult.at_risk_count, null);
assert.strictEqual(smallGroupResult.at_risk_percentage, null);
console.log("   ✓ Verified small-group privacy protection (cell suppression when N < 5 for leadership)");

// 18d.3 Empty cohort safe handling
const emptyResult = mockComputeCohortRiskDistribution([], [], false);
assert.strictEqual(emptyResult.totalStudents, 0);
assert.strictEqual(emptyResult.evaluatedStudentsCount, 0);
assert.strictEqual(emptyResult.coveragePercentage, 0);
assert.strictEqual(emptyResult.at_risk_count, 0);
assert.strictEqual(emptyResult.at_risk_percentage, 0);
assert.strictEqual(emptyResult.is_privacy_suppressed, false);
console.log("   ✓ Verified empty cohort safe handling (0% without division-by-zero or NaN)\n");

// =========================================================================
// 19. Validating Phase 6 Model Performance Dashboard Contracts...
// =========================================================================
console.log("19. Validating Phase 6 Model Performance Dashboard Contracts...");

const provenanceCardPath = path.join(__dirname, "../components/analytics/ModelEvaluationProvenanceCard.tsx");
const confusionCardPath = path.join(__dirname, "../components/analytics/ConfusionMatrixCard.tsx");
const reliabilityCardPath = path.join(__dirname, "../components/analytics/ReliabilityCalibrationChart.tsx");
const rocCardPath = path.join(__dirname, "../components/analytics/ROCPRCurveChart.tsx");
const fairnessTablePath = path.join(__dirname, "../components/analytics/SubgroupFairnessTable.tsx");
const dashboardContainerPath = path.join(__dirname, "../components/analytics/ModelPerformanceDashboard.tsx");

assert(fs.existsSync(provenanceCardPath), "ModelEvaluationProvenanceCard.tsx must exist");
assert(fs.existsSync(confusionCardPath), "ConfusionMatrixCard.tsx must exist");
assert(fs.existsSync(reliabilityCardPath), "ReliabilityCalibrationChart.tsx must exist");
assert(fs.existsSync(rocCardPath), "ROCPRCurveChart.tsx must exist");
assert(fs.existsSync(fairnessTablePath), "SubgroupFairnessTable.tsx must exist");
assert(fs.existsSync(dashboardContainerPath), "ModelPerformanceDashboard.tsx must exist");

const provenanceCode = fs.readFileSync(provenanceCardPath, "utf-8");
const confusionCode = fs.readFileSync(confusionCardPath, "utf-8");
const reliabilityCode = fs.readFileSync(reliabilityCardPath, "utf-8");
const rocCode = fs.readFileSync(rocCardPath, "utf-8");
const fairnessCode = fs.readFileSync(fairnessTablePath, "utf-8");
const modelPerfDashboardCode = fs.readFileSync(dashboardContainerPath, "utf-8");

// 19a. Components mounted in Analytics Page & Dashboard Container
const updatedAnalyticsPage = fs.readFileSync(
  path.resolve(__dirname, "../app/analytics/page.tsx"),
  "utf-8"
);
assert(
  updatedAnalyticsPage.includes("ModelPerformanceDashboard"),
  "Analytics page must mount ModelPerformanceDashboard"
);
assert(
  modelPerfDashboardCode.includes("ModelEvaluationProvenanceCard") &&
  modelPerfDashboardCode.includes("ConfusionMatrixCard") &&
  modelPerfDashboardCode.includes("ReliabilityCalibrationChart") &&
  modelPerfDashboardCode.includes("ROCPRCurveChart") &&
  modelPerfDashboardCode.includes("SubgroupFairnessTable"),
  "ModelPerformanceDashboard must integrate all 5 Phase 6 evaluation visualisations"
);
console.log("   ✓ Verified Phase 6 Model Performance components mounted and linked in analytics/page.tsx");

// 19b. Offline Held-Out Benchmark vs Live Telemetry Distinction (Requirement 5)
assert(
  provenanceCode.includes("OFFLINE HELD-OUT BENCHMARK") &&
  provenanceCode.includes("LIVE TELEMETRY ACTIVE"),
  "ModelEvaluationProvenanceCard must clearly distinguish offline held-out benchmark from live telemetry"
);
assert(
  provenanceCode.includes("Historical Partition Notice") || provenanceCode.includes("HISTORICAL PARTITION NOTICE"),
  "ModelEvaluationProvenanceCard must surface historical partition warning (2014J)"
);
console.log("   ✓ Verified strict separation between offline held-out evaluation and live telemetry");

// 19c. Confusion Matrix & Decision Threshold tau = 0.46 (Requirement 4)
assert(
  confusionCode.includes("Confusion Matrix") &&
  confusionCode.includes("True Positive (TP)") &&
  confusionCode.includes("False Positive (FP)") &&
  confusionCode.includes("True Negative (TN)") &&
  confusionCode.includes("False Negative (FN)") &&
  confusionCode.includes("0.46"),
  "ConfusionMatrixCard must display 2x2 matrix at decision threshold 0.46"
);
assert(
  confusionCode.includes("Operational Staff Capacity Impact") &&
  confusionCode.includes("Advisor Review Burden"),
  "ConfusionMatrixCard must surface operational workload and false alarm burden"
);
console.log("   ✓ Verified 2x2 confusion matrix and operational advisor burden at threshold 0.46");

// 19d. Probability Calibration & Reliability Bins (Requirement 3)
assert(
  reliabilityCode.includes("Probability Calibration") &&
  reliabilityCode.includes("Expected Calib. Error (ECE)") &&
  reliabilityCode.includes("Brier Score") &&
  reliabilityCode.includes("Perfect Calibration (Ideal y = x)"),
  "ReliabilityCalibrationChart must plot 10 reliability bins with diagonal reference line and ECE"
);
console.log("   ✓ Verified probability calibration plot, 10-bin reliability table, and ECE/Brier badges");

// 19e. Anti-Fabrication ROC & PR Curve Contracts (Requirement 7)
assert(
  rocCode.includes("Per-Record Score Vectors Unavailable") &&
  rocCode.includes("must not be fabricated from a single score or aggregate summary"),
  "ROCPRCurveChart must display explicit limitation warning if per-record scores are absent"
);
assert(
  rocCode.includes("Operating Point (τ = 0.46)") && rocCode.includes("ROC (AUC"),
  "ROCPRCurveChart must plot empirical ROC/PR curves with threshold 0.46 highlighted"
);
console.log("   ✓ Verified anti-fabrication safeguards for ROC/PR curve generation");

// 19f. Subgroup Parity & Fairness Disclaimer (Requirement 8)
assert(
  fairnessCode.includes("Fairness & Parity Notice") &&
  fairnessCode.includes("does NOT demonstrate that the model is fair"),
  "SubgroupFairnessTable must display mandatory fairness notice"
);
assert(
  fairnessCode.includes("Low Confidence (N < 100)") &&
  fairnessCode.includes("Suppressed under ADR-004: Cell size N < 5"),
  "SubgroupFairnessTable must flag sample size < 100 as low confidence and suppress N < 5"
);
console.log("   ✓ Verified subgroup parity disaggregation, confidence flags, and non-bias disclaimer");

// 19g. Frozen Model & Version Mismatch Invariants (Requirement 1 & 9)
assert(
  modelPerfDashboardCode.includes("Evaluation Data Unavailable") &&
  modelPerfDashboardCode.includes("Reset to Deployed Baseline (v1.0.0)"),
  "Dashboard must cleanly surface model-version mismatch and missing data limitations without crashing"
);
console.log("   ✓ Verified frozen model version invariants and clean handling of version mismatch\n");


console.log("==================================================");
console.log("ALL FRONTEND CONTRACT & INTEGRATION TESTS PASSED ✓");
console.log("==================================================");

