/**
 * Unit Test Suite for SUTRA Leaderboard & Rewards Scoring and Invariants
 */

import assert from "node:assert";
import {
  assertPulseDecoupling,
  getPulseParticipationPoints,
  computeRewardProgress,
  resolveNextRewardTarget,
  formatPrivacySafeDisplayName,
  rankLeaderboardEntries,
  validateRedemptionEligibility,
  hasClaimedActivityInPeriod,
  ELIGIBLE_ACTIVITIES,
  PUBLISHED_REWARDS_CATALOG,
} from "../lib/rewardsScoring";
import {
  LeaderboardEntryDTO,
  RewardItemDTO,
  PointsTransactionDTO,
} from "../lib/types";

console.log("=== SUTRA Leaderboard & Rewards Unit Test Suite ===\n");

// --- TEST 1: Happiness Pulse Strict Decoupling Invariant ---
console.log("1. Validating Happiness Pulse flat participation decoupling invariant...");
assert.strictEqual(getPulseParticipationPoints(), 10);
assert.strictEqual(assertPulseDecoupling(10), true);
assert.strictEqual(assertPulseDecoupling(15), false);
assert.strictEqual(assertPulseDecoupling(0), false);
const pulseActivity = ELIGIBLE_ACTIVITIES.find((a) => a.key === "weekly_pulse");
assert.ok(pulseActivity, "weekly_pulse must exist in eligible activities");
assert.strictEqual(pulseActivity?.points, 10);
console.log("   ✓ Strict decoupling verified: pulse check-in awards flat 10 pts regardless of answers.\n");

// --- TEST 2: Wallet Milestone & Reward Progress Calculation ---
console.log("2. Validating reward milestone progress calculations...");
const progress1 = computeRewardProgress(385, 500);
assert.strictEqual(progress1.pointsNeeded, 115);
assert.strictEqual(progress1.progressPercent, 77);

const progress2 = computeRewardProgress(600, 500);
assert.strictEqual(progress2.pointsNeeded, 0);
assert.strictEqual(progress2.progressPercent, 100);

const nextTarget = resolveNextRewardTarget(385, PUBLISHED_REWARDS_CATALOG);
assert.strictEqual(nextTarget.points_cost, 500);
assert.strictEqual(nextTarget.title, "College Merchandise T-Shirt");
console.log("   ✓ Milestone reward calculations accurate.\n");

// --- TEST 3: Privacy-Safe Display Names ---
console.log("3. Validating privacy-safe display names on leaderboards...");
assert.strictEqual(formatPrivacySafeDisplayName("Asha Kulkarni"), "Asha K.");
assert.strictEqual(formatPrivacySafeDisplayName("Rohan Verma Sharma"), "Rohan S.");
assert.strictEqual(formatPrivacySafeDisplayName("Asha"), "Asha");
assert.strictEqual(formatPrivacySafeDisplayName(""), "Student Participant");
console.log("   ✓ Display name pseudonymization confirmed.\n");

// --- TEST 4: Period-based Leaderboard and Tie-Breaker Ranking ---
console.log("4. Validating period leaderboard rankings and tie-breaker handling...");
const sampleEntries: LeaderboardEntryDTO[] = [
  { rank: 0, display_name: "Rohan M.", points_in_period: 40, activities_count: 3 },
  { rank: 0, display_name: "Kavita S.", points_in_period: 40, activities_count: 3 },
  { rank: 0, display_name: "Dev P.", points_in_period: 25, activities_count: 2 },
];
const ranked = rankLeaderboardEntries(sampleEntries);
assert.strictEqual(ranked[0].rank, 1);
assert.strictEqual(ranked[1].rank, 1);
assert.strictEqual(ranked[2].rank, 3);
console.log("   ✓ Stable tie-breaking and standard competition ranking confirmed.\n");

// --- TEST 5: Reward Redemption Eligibility Validation ---
console.log("5. Validating authoritative reward redemption checks...");
const mockReward: RewardItemDTO = {
  id: "test-rew-1",
  title: "Test Sticker Pack",
  description: "Test description",
  points_cost: 200,
  category: "merchandise",
  stock: 10,
  is_available: true,
  is_digital: false,
};

const check1 = validateRedemptionEligibility(250, mockReward);
assert.strictEqual(check1.eligible, true);

const check2 = validateRedemptionEligibility(150, mockReward);
assert.strictEqual(check2.eligible, false);
assert.ok(check2.reason?.includes("Insufficient points"));
assert.ok(check2.reason?.includes("50 more point"));

const check3 = validateRedemptionEligibility(300, { ...mockReward, stock: 0 });
assert.strictEqual(check3.eligible, false);
assert.ok(check3.reason?.includes("out of stock"));
console.log("   ✓ Redemption validations strictly enforce balance and stock rules.\n");

// --- TEST 6: Duplicate Activity Claim Detection ---
console.log("6. Validating duplicate activity claim prevention in current cycle...");
const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

const sampleTxs: PointsTransactionDTO[] = [
  {
    id: "tx-1",
    student_id: "SYN-1007",
    activity_or_reward_id: "weekly_pulse",
    points: 10,
    status: "credited",
    description: "Weekly pulse",
    created_at: nowIso,
  },
  {
    id: "tx-2",
    student_id: "SYN-1007",
    activity_or_reward_id: "approved_workshop",
    points: 15,
    status: "credited",
    description: "Old workshop",
    created_at: oldIso,
  },
];

assert.strictEqual(hasClaimedActivityInPeriod("weekly_pulse", sampleTxs), true);
assert.strictEqual(hasClaimedActivityInPeriod("approved_workshop", sampleTxs), false);
assert.strictEqual(hasClaimedActivityInPeriod("daily_micro_challenge", sampleTxs), false);
console.log("   ✓ Duplicate claim guards verified.\n");
