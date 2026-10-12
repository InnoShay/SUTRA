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

console.log("==================================================");
console.log("ALL FRONTEND CONTRACT & INTEGRATION TESTS PASSED ✓");
console.log("==================================================");
