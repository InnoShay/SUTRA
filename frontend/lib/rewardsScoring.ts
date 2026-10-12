/**
 * SUTRA Leaderboard & Rewards Scoring and Business Invariants
 * Pure calculation and validation logic for voluntary engagement recognition.
 *
 * CRITICAL ARCHITECTURAL SAFEGUARDS:
 * 1. Happiness Index strictly decoupled: Pulse check-in awards flat 10 participation points.
 *    Scores never vary by answers; distress is never penalized; high happiness never bonuses.
 * 2. Period-specific leaderboard: Ranks are calculated from period points, never lifetime balance.
 * 3. Authoritative verification: Client cannot fabricate balances or ignore stock availability.
 * 4. Privacy: Student identifiers and emails are never exposed on public leaderboards.
 */

import {
  EligibleActivityDTO,
  RewardItemDTO,
  LeaderboardEntryDTO,
  LeaderboardPeriod,
  PointsTransactionDTO,
  PointsWalletDTO,
} from "./types";

/**
 * Standard published eligible activities with proposed points policies
 */
export const ELIGIBLE_ACTIVITIES: EligibleActivityDTO[] = [
  {
    key: "weekly_pulse",
    title: "Complete the Weekly Happiness Pulse",
    description: "Confidential weekly pulse check-in to help improve campus experience and student services.",
    category: "wellness_pulse",
    points: 10,
    frequency_label: "Once per reporting week",
  },
  {
    key: "daily_micro_challenge",
    title: "Complete an Approved Daily Micro-Challenge",
    description: "Lightweight 5-minute study habit, mindfulness, or peer collaboration exercise.",
    category: "micro_challenge",
    points: 5,
    frequency_label: "Once per eligible challenge",
  },
  {
    key: "approved_workshop",
    title: "Participate in an Approved Workshop",
    description: "Verified attendance in institutional skill-building, mental resilience, or academic workshop.",
    category: "workshop",
    points: 15,
    frequency_label: "Once per eligible event",
  },
  {
    key: "student_development",
    title: "Attend Student Development Activity",
    description: "Participation in career orientation, leadership seminar, or peer mentoring circle.",
    category: "student_development",
    points: 10,
    frequency_label: "Once per eligible activity",
  },
  {
    key: "verified_learning",
    title: "Complete a Verified Learning Module",
    description: "Completion of an authorized asynchronous micro-credential or study protocol.",
    category: "learning_activity",
    points: 10,
    frequency_label: "Once per eligible activity",
  },
  {
    key: "campus_improvement",
    title: "Participate in Campus Improvement Initiative",
    description: "Verified contribution to student body welfare, campus sustainability, or peer aid program.",
    category: "campus_improvement",
    points: 20,
    frequency_label: "Once per eligible initiative",
  },
];

/**
 * Canonical published rewards catalogue
 */
export const PUBLISHED_REWARDS_CATALOG: RewardItemDTO[] = [
  {
    id: "rew-101",
    title: "Digital Achievement Badge",
    description: "Verified digital badge for your SUTRA profile celebrating voluntary engagement and participation.",
    points_cost: 100,
    category: "digital",
    stock: 9999,
    is_available: true,
    is_digital: true,
    eligibility_notes: "Available to all enrolled students with 100+ points.",
  },
  {
    id: "rew-201",
    title: "College Sticker Pack",
    description: "High-quality die-cut vinyl sticker pack featuring SUTRA and university campus crests.",
    points_cost: 200,
    category: "merchandise",
    stock: 45,
    is_available: true,
    is_digital: false,
    eligibility_notes: "Collect at Student Services Center (Room 102).",
  },
  {
    id: "rew-301",
    title: "College Merchandise T-Shirt",
    description: "Official organic cotton campus t-shirt available in sizes S to XXL.",
    points_cost: 500,
    category: "merchandise",
    stock: 20,
    is_available: true,
    is_digital: false,
    eligibility_notes: "Collect at Student Services Center upon approval.",
  },
  {
    id: "rew-401",
    title: "Sponsored Workshop Benefit",
    description: "Complimentary access pass to an industry-sponsored masterclass or certification voucher.",
    points_cost: 500,
    category: "experience",
    stock: 12,
    is_available: true,
    is_digital: true,
    eligibility_notes: "Digital registration voucher issued upon redemption.",
  },
  {
    id: "rew-501",
    title: "Exclusive Event Merchandise",
    description: "Limited-edition campus hoodie or technical windbreaker commemorating the academic year.",
    points_cost: 750,
    category: "merchandise",
    stock: 8,
    is_available: true,
    is_digital: false,
    eligibility_notes: "Collect at Student Affairs Office.",
  },
  {
    id: "rew-601",
    title: "Merchandise Bundle",
    description: "Comprehensive campus bundle including hoodie, insulated water bottle, and premium notebook.",
    points_cost: 1000,
    category: "merchandise",
    stock: 4,
    is_available: true,
    is_digital: false,
    eligibility_notes: "Pre-order fulfilment, collect at Student Affairs Office.",
  },
];

/**
 * Ensures strict decoupling between Happiness Pulse score and awarded participation points.
 * Invariant: Pulse points are ALWAYS flat (10 points). No score weighting permitted.
 */
export function getPulseParticipationPoints(): number {
  return 10;
}

/**
 * Validates that an activity reward calculation never varies based on wellbeing score.
 */
export function assertPulseDecoupling(pointsAwarded: number): boolean {
  return pointsAwarded === 10;
}

/**
 * Computes progress percentage toward the next reward tier.
 */
export function computeRewardProgress(
  availableBalance: number,
  targetCost: number
): { progressPercent: number; pointsNeeded: number } {
  if (targetCost <= 0) {
    return { progressPercent: 100, pointsNeeded: 0 };
  }
  const pointsNeeded = Math.max(0, targetCost - availableBalance);
  const progressPercent = Math.min(100, Math.max(0, Math.round((availableBalance / targetCost) * 100)));
  return { progressPercent, pointsNeeded };
}

/**
 * Resolves the next closest un-redeemed reward for a student.
 */
export function resolveNextRewardTarget(
  availableBalance: number,
  catalog: RewardItemDTO[] = PUBLISHED_REWARDS_CATALOG
): RewardItemDTO {
  const higherTier = catalog
    .filter((r) => r.is_available && r.points_cost > availableBalance)
    .sort((a, b) => a.points_cost - b.points_cost)[0];

  if (higherTier) return higherTier;

  // If student has points for everything, target the top tier
  return [...catalog].sort((a, b) => b.points_cost - a.points_cost)[0] || catalog[0];
}

/**
 * Formats a privacy-safe student display name for the leaderboard.
 * Excludes student IDs, phone numbers, and full sensitive identifiers.
 * E.g., "Asha Kulkarni" -> "Asha K."
 */
export function formatPrivacySafeDisplayName(name: string): string {
  if (!name || typeof name !== "string") return "Student Participant";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Stable tie-breaker ranking for leaderboard entries:
 * 1. Points in period (descending)
 * 2. Activities count (descending)
 * 3. Display name (alphabetical)
 *
 * Applies standard competition ranking (e.g. ties receive same rank, next rank skips accordingly).
 */
export function rankLeaderboardEntries(
  entries: LeaderboardEntryDTO[]
): LeaderboardEntryDTO[] {
  if (!entries || entries.length === 0) return [];

  // Sort with stable tie breakers
  const sorted = [...entries].sort((a, b) => {
    if (b.points_in_period !== a.points_in_period) {
      return b.points_in_period - a.points_in_period;
    }
    const aActs = a.activities_count || 0;
    const bActs = b.activities_count || 0;
    if (bActs !== aActs) {
      return bActs - aActs;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  // Assign ranks with standard competition ranking
  let currentRank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && entry.points_in_period === sorted[index - 1].points_in_period) {
      // Tied with previous
      return { ...entry, rank: currentRank };
    }
    currentRank = index + 1;
    return { ...entry, rank: currentRank };
  });
}

/**
 * Validates redemption eligibility against authoritative constraints.
 */
export function validateRedemptionEligibility(
  availableBalance: number,
  reward: RewardItemDTO
): { eligible: boolean; reason?: string } {
  if (!reward.is_available) {
    return { eligible: false, reason: "This reward is currently unavailable or inactive." };
  }
  if (reward.stock <= 0) {
    return { eligible: false, reason: "This reward is currently out of stock." };
  }
  if (availableBalance < reward.points_cost) {
    const deficit = reward.points_cost - availableBalance;
    return {
      eligible: false,
      reason: `Insufficient points. You need ${deficit} more point${deficit === 1 ? "" : "s"} to redeem this item.`,
    };
  }
  return { eligible: true };
}

/**
 * Checks whether an activity has already been claimed in the current period.
 */
export function hasClaimedActivityInPeriod(
  activityKey: string,
  transactions: PointsTransactionDTO[],
  currentPeriodStartIso?: string
): boolean {
  if (!transactions || transactions.length === 0) return false;
  
  const startTime = currentPeriodStartIso
    ? new Date(currentPeriodStartIso).getTime()
    : Date.now() - 7 * 24 * 60 * 60 * 1000; // default 7 days

  return transactions.some((t) => {
    if (t.activity_or_reward_id !== activityKey) return false;
    if (t.status === "cancelled") return false;
    const txTime = new Date(t.created_at).getTime();
    return txTime >= startTime;
  });
}

/**
 * Calculates rank change between current period and previous period.
 * Positive integer = improvement (e.g. from #14 to #12 = +2).
 * Negative integer = drop (e.g. from #10 to #12 = -2).
 * 0 = no change.
 * null = no previous rank recorded.
 */
export function computePrivateRankChange(
  currentRank: number,
  previousRank: number | null | undefined
): number | null {
  if (previousRank === null || previousRank === undefined || previousRank <= 0) {
    return null;
  }
  return previousRank - currentRank;
}

/**
 * Validates that private student payload never exposes peer student rankings or rosters.
 */
export function assertPrivateStandingSecurity(data: any): boolean {
  if (!data) return true;
  if (Array.isArray(data.entries) && data.entries.length > 1) {
    return false;
  }
  return true;
}

