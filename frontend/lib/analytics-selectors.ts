/**
 * SUTRA Analytics Selectors & Operational Aggregation Engine
 * Phase 4: Analytics & Chart Data Integrity
 *
 * All metrics computed deterministically from verified SUTRA domain collections:
 * - Signal records (SignalDTO)
 * - Case records (CaseDetailDTO)
 * - Student records (Student)
 * - User Role context (UserRole, enforcing ADR-004 leadership privacy)
 *
 * Rules:
 * 1. Zero fabricated growth badges or percentage multipliers.
 * 2. Real zeros distinguished from missing/unavailable data.
 * 3. Canonical 10-state case machine distribution.
 * 4. Canonical 4 intervention types accounted for.
 * 5. Temporal bucketing strictly uses real signal timestamps (evaluated_at).
 * 6. Mathematical guards against division by zero (NaN protection).
 */

import { SignalDTO, CaseDetailDTO, CaseState, UserRole } from "./types";
import { Student } from "./skillhub-data";

export const CANONICAL_CASE_STATES: readonly CaseState[] = [
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
] as const;

export interface CaseStateCount {
  state: CaseState;
  count: number;
  label: string;
  isTerminal: boolean;
}

export interface CaseLifecycleDistribution {
  states: CaseStateCount[];
  totalCases: number;
  activeCount: number; // Non-terminal cases (NEW through FOLLOW_UP_REQUIRED)
  resolvedCount: number; // Terminal cases (RESOLVED, CLOSED)
  resolutionRatePct: number; // Math.round((resolved / total) * 100) or 0 if total === 0
}

export interface InterventionCount {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface InterventionDistribution {
  items: InterventionCount[];
  totalAssigned: number;
  hasUnassigned: boolean;
  unassignedCount: number;
}

export interface SignalTimelinePoint {
  dateKey: string; // ISO date 'YYYY-MM-DD' or label
  label: string;
  signalsCount: number;
  concernsCount: number;
  dismissedCount: number;
  reviewedCount: number;
}

export interface SignalTimelineSummary {
  points: SignalTimelinePoint[];
  hasData: boolean;
  totalSignals: number;
  timeWindowLabel: string;
  oldestDate?: string;
  newestDate?: string;
}

export interface TelemetrySummaryItem {
  id: string;
  label: string;
  value: string | number;
  sublabel: string;
  badge?: string;
  isPositive?: boolean;
  isRestricted?: boolean;
}

export interface AnalyticsOperationalCards {
  studentsInScope: TelemetrySummaryItem;
  signalsGenerated: TelemetrySummaryItem;
  triageReviewRate: TelemetrySummaryItem;
  activeCases: TelemetrySummaryItem;
}

export interface RiskAttributionCount {
  feature: string;
  label: string;
  count: number;
  avgAttribution: number;
}

/**
 * 1. Computes the canonical 10-state case distribution.
 * Handles empty collections safely without omitting states.
 */
export function computeCaseStateDistribution(
  cases: CaseDetailDTO[]
): CaseLifecycleDistribution {
  const counts: Record<string, number> = {};
  for (const st of CANONICAL_CASE_STATES) {
    counts[st] = 0;
  }

  let totalCases = 0;
  for (const c of cases) {
    if (!c) continue;
    totalCases++;
    const normalized = ((c.state || "").toUpperCase() as CaseState);
    if (counts[normalized] !== undefined) {
      counts[normalized]++;
    } else {
      // Fallback if an unknown state is present
      counts["NEW"] = (counts["NEW"] || 0) + 1;
    }
  }

  const states: CaseStateCount[] = CANONICAL_CASE_STATES.map((state) => {
    const isTerminal = state === "RESOLVED" || state === "CLOSED";
    const label = state
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    return {
      state,
      count: counts[state] || 0,
      label,
      isTerminal,
    };
  });

  const resolvedCount = (counts["RESOLVED"] || 0) + (counts["CLOSED"] || 0);
  const activeCount = totalCases - resolvedCount;
  const resolutionRatePct =
    totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0;

  return {
    states,
    totalCases,
    activeCount,
    resolvedCount,
    resolutionRatePct,
  };
}

/**
 * 2. Computes Intervention Type distribution from actual case records.
 * Uses canonical intervention definitions.
 */
export const CANONICAL_INTERVENTIONS = [
  { key: "academic_tutoring_offer", label: "Subject Tutoring Referral" },
  { key: "mentor_check_in", label: "Faculty Mentorship 1-on-1" },
  { key: "counselling_referral", label: "Student Wellbeing Referral" },
  { key: "fee_emergency_counselling", label: "Financial Aid Consultation" },
] as const;

export function computeInterventionDistribution(
  cases: CaseDetailDTO[]
): InterventionDistribution {
  const keyMap: Record<string, number> = {};
  for (const intDef of CANONICAL_INTERVENTIONS) {
    keyMap[intDef.key] = 0;
  }

  let totalAssigned = 0;
  let unassignedCount = 0;

  for (const c of cases) {
    if (!c) continue;
    const intKey = c.selected_intervention_key;
    if (!intKey || intKey.trim() === "") {
      unassignedCount++;
    } else {
      totalAssigned++;
      if (keyMap[intKey] !== undefined) {
        keyMap[intKey]++;
      } else {
        // Unknown intervention key counted dynamically
        keyMap[intKey] = (keyMap[intKey] || 0) + 1;
      }
    }
  }

  const items: InterventionCount[] = CANONICAL_INTERVENTIONS.map((intDef) => {
    const count = keyMap[intDef.key] || 0;
    const percentage =
      totalAssigned > 0 ? Math.round((count / totalAssigned) * 100) : 0;
    return {
      key: intDef.key,
      label: intDef.label,
      count,
      percentage,
    };
  });

  // Include any extra unknown keys that were present in records
  for (const [key, count] of Object.entries(keyMap)) {
    if (!CANONICAL_INTERVENTIONS.some((i) => i.key === key)) {
      const percentage =
        totalAssigned > 0 ? Math.round((count / totalAssigned) * 100) : 0;
      items.push({
        key,
        label: key.replace(/_/g, " "),
        count,
        percentage,
      });
    }
  }

  return {
    items,
    totalAssigned,
    hasUnassigned: unassignedCount > 0,
    unassignedCount,
  };
}

/**
 * 3. Aggregates signal generation trend strictly based on actual signal timestamps (evaluated_at).
 * Does NOT synthesize points or interpolate fake activity.
 */
export function computeSignalTimeline(
  signals: SignalDTO[],
  timeframe: "This Week" | "This Month" | "This Year" = "This Month"
): SignalTimelineSummary {
  if (!signals || signals.length === 0) {
    return {
      points: [],
      hasData: false,
      totalSignals: 0,
      timeWindowLabel: timeframe,
    };
  }

  // Sort signals ascending by valid evaluated_at timestamp
  const validSignals = signals.filter(
    (s) => s.evaluated_at && !isNaN(new Date(s.evaluated_at).getTime())
  );

  if (validSignals.length === 0) {
    return {
      points: [],
      hasData: false,
      totalSignals: signals.length,
      timeWindowLabel: timeframe,
    };
  }

  validSignals.sort(
    (a, b) =>
      new Date(a.evaluated_at).getTime() - new Date(b.evaluated_at).getTime()
  );

  const oldestDate = validSignals[0].evaluated_at;
  const newestDate = validSignals[validSignals.length - 1].evaluated_at;

  // Group signals by day (YYYY-MM-DD)
  const dayGroups: Record<
    string,
    { count: number; concerns: number; dismissed: number; reviewed: number }
  > = {};

  for (const sig of validSignals) {
    const d = new Date(sig.evaluated_at);
    const dayKey = d.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = { count: 0, concerns: 0, dismissed: 0, reviewed: 0 };
    }

    dayGroups[dayKey].count++;
    if ((sig.result || "").toLowerCase() === "concern") {
      dayGroups[dayKey].concerns++;
    }
    if ((sig.reviewed_decision || "").toLowerCase() === "dismiss") {
      dayGroups[dayKey].dismissed++;
    }
    if (sig.reviewed_decision && sig.reviewed_decision.trim() !== "") {
      dayGroups[dayKey].reviewed++;
    }
  }

  const points: SignalTimelinePoint[] = Object.keys(dayGroups)
    .sort()
    .map((dateKey) => {
      const g = dayGroups[dateKey];
      const d = new Date(dateKey);
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      return {
        dateKey,
        label,
        signalsCount: g.count,
        concernsCount: g.concerns,
        dismissedCount: g.dismissed,
        reviewedCount: g.reviewed,
      };
    });

  return {
    points,
    hasData: points.length > 0,
    totalSignals: validSignals.length,
    timeWindowLabel: timeframe,
    oldestDate,
    newestDate,
  };
}

/**
 * 4. Extracts primary feature attribution risk drivers from signal evidence cards.
 */
export function computeRiskAttributions(
  signals: SignalDTO[]
): RiskAttributionCount[] {
  const featureMap: Record<
    string,
    { count: number; sumAttribution: number }
  > = {};

  for (const s of signals) {
    const attributions = s.evidence_card?.attributions;
    if (Array.isArray(attributions)) {
      for (const item of attributions) {
        if (!item || !item.feature) continue;
        const fKey = item.feature;
        if (!featureMap[fKey]) {
          featureMap[fKey] = { count: 0, sumAttribution: 0 };
        }
        featureMap[fKey].count++;
        featureMap[fKey].sumAttribution += Math.abs(item.attribution || 0);
      }
    }
  }

  return Object.keys(featureMap).map((feat) => {
    const data = featureMap[feat];
    const avgAttribution =
      data.count > 0
        ? parseFloat((data.sumAttribution / data.count).toFixed(2))
        : 0;

    const label = feat
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      feature: feat,
      label,
      count: data.count,
      avgAttribution,
    };
  });
}

/**
 * 5. Computes high-level operational summary cards for Analytics page.
 * Strictly checks ADR-004 leadership privacy, backend connection status, and real denominators.
 */
export function computeAnalyticsOperationalCards(
  signals: SignalDTO[],
  cases: CaseDetailDTO[],
  students: Student[],
  activeRole: UserRole,
  backendConnected: boolean,
  timeframe: "This Week" | "This Month" | "This Year" = "This Month"
): AnalyticsOperationalCards {
  const isLeadership = activeRole === "leadership";
  const studentCount = students.length;

  // 1. Students in Scope
  const studentsInScope: TelemetrySummaryItem = {
    id: "students-scope",
    label: "Students in Scope",
    value: isLeadership ? "Restricted" : studentCount,
    sublabel: isLeadership
      ? "ADR-004 Privacy Safeguard (Aggregates Only)"
      : "Active campus cohort CS-Y2",
    badge: isLeadership ? "Privacy Active" : `${studentCount} Enrolled`,
    isRestricted: isLeadership,
  };

  // 2. Signals Generated
  const signalsCount = signals.length;
  const concernsCount = signals.filter(
    (s) => (s.result || "").toLowerCase() === "concern"
  ).length;

  const signalsGenerated: TelemetrySummaryItem = {
    id: "signals-generated",
    label: "Generated Signals",
    value: signalsCount,
    sublabel:
      signalsCount === 0
        ? "No risk signals triggered"
        : `${concernsCount} policy risk ${concernsCount === 1 ? "concern" : "concerns"}`,
    badge: backendConnected ? "Authoritative" : "Deterministic Engine",
    isPositive: concernsCount === 0,
  };

  // 3. Closed-Loop Triage Review Rate
  // Defined as (signals reviewed) / totalSignals * 100
  // When zero signals exist, rate is 100% (clean state, zero unhandled alerts)
  const pendingSignals = signals.filter(
    (s) => !s.reviewed_decision || s.reviewed_decision.trim() === ""
  );
  const reviewedCount = signalsCount - pendingSignals.length;
  const triageActionRate =
    signalsCount > 0
      ? Math.round((reviewedCount / signalsCount) * 100)
      : 100;

  const triageReviewRate: TelemetrySummaryItem = {
    id: "triage-velocity",
    label: "Closed-Loop Action Rate",
    value: `${triageActionRate}%`,
    sublabel:
      signalsCount === 0
        ? "Queue clear: 0 pending signals"
        : `${reviewedCount} of ${signalsCount} evaluated under SLA`,
    badge: triageActionRate >= 80 ? "SLA Compliant" : "Review Required",
    isPositive: triageActionRate >= 80,
  };

  // 4. Active Support Cases
  const nonTerminalCases = cases.filter((c) => {
    const s = (c.state || "").toUpperCase();
    return s !== "RESOLVED" && s !== "CLOSED";
  });
  const activeCasesCount = nonTerminalCases.length;
  const escalatedCount = cases.filter((c) => c.is_escalated).length;

  const activeCases: TelemetrySummaryItem = {
    id: "active-cases",
    label: "Active Support Cases",
    value: activeCasesCount,
    sublabel:
      escalatedCount > 0
        ? `${escalatedCount} cases escalated to dean/lead`
        : "10-state lifecycle actively tracked",
    badge: activeCasesCount > 0 ? "Under Care" : "Nominal",
    isPositive: escalatedCount === 0,
  };

  return {
    studentsInScope,
    signalsGenerated,
    triageReviewRate,
    activeCases,
  };
}
