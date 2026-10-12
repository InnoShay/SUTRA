/**
 * SUTRA Student Guidance Assessment - Deterministic Scoring Logic
 *
 * Requirements:
 * - 6 independent dimensions, exactly 3 questions per dimension.
 * - A dimension score may be calculated ONLY when all 3 questions have valid responses (1–5).
 * - If any of the three answers is missing or skipped, the dimension yields "Insufficient responses".
 * - Valid responses are scored 1 to 5.
 * - Skipped answers are NEVER treated as zero.
 * - Arithmetic mean calculated to 2 decimal places.
 * - Interpretation Bands:
 *     1.00 – 2.49: "Explore support"
 *     2.50 – 3.49: "Mixed / developing"
 *     3.50 – 5.00: "Current resource"
 * - DO NOT calculate an overall composite score, clinical diagnosis, risk score, or ranking.
 */

import {
  AssessmentDimensionKey,
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_DISCLAIMER,
} from "./assessmentData";

export type InterpretationBandKey =
  | "explore_support"
  | "mixed_developing"
  | "current_resource";

export interface InterpretationBandInfo {
  key: InterpretationBandKey;
  label: "Explore support" | "Mixed / developing" | "Current resource";
  range: string;
  description: string;
  badgeClass: string;
  barColorClass: string;
}

export const INTERPRETATION_BANDS: Record<
  InterpretationBandKey,
  InterpretationBandInfo
> = {
  explore_support: {
    key: "explore_support",
    label: "Explore support",
    range: "1.00–2.49",
    description: "May benefit from exploring additional strategies or support resources.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    barColorClass: "bg-amber-500",
  },
  mixed_developing: {
    key: "mixed_developing",
    label: "Mixed / developing",
    range: "2.50–3.49",
    description: "Developing foundation; good starting point for collaborative goal setting.",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    barColorClass: "bg-sky-500",
  },
  current_resource: {
    key: "current_resource",
    label: "Current resource",
    range: "3.50–5.00",
    description: "Self-identified area of confidence and personal strength to build upon.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    barColorClass: "bg-emerald-500",
  },
};

export interface DimensionScoreResult {
  dimensionKey: AssessmentDimensionKey;
  title: string;
  shortDescription: string;
  discussionSuggestion: string;
  status: "scored" | "insufficient";
  mean: number | null;
  formattedMean: string;
  band: InterpretationBandInfo | null;
  validAnswerCount: number;
  totalQuestions: number;
  questionIds: string[];
}

export interface ReflectionAnswers {
  q19Challenge?: string;
  q19CustomText?: string;
  q20SessionGoal?: string;
  q20CustomText?: string;
}

export interface AssessmentReportResult {
  completionStatus: "completed" | "partial";
  completedAt: string;
  dimensions: DimensionScoreResult[];
  answeredQuestionsCount: number;
  skippedQuestionsCount: number;
  totalQuestionsCount: number;
  reflections: ReflectionAnswers;
  disclaimer: string;
  isSessionOnly: boolean;
}

/**
 * Determine the interpretation band based on arithmetic mean.
 * Boundaries:
 * 1.00 - 2.49: Explore support
 * 2.50 - 3.49: Mixed / developing
 * 3.50 - 5.00: Current resource
 */
export function getInterpretationBand(mean: number): InterpretationBandInfo {
  // Allow slight epsilon tolerance for IEEE-754 precision
  if (mean < 2.50) {
    return INTERPRETATION_BANDS.explore_support;
  }
  if (mean < 3.50) {
    return INTERPRETATION_BANDS.mixed_developing;
  }
  return INTERPRETATION_BANDS.current_resource;
}

/**
 * Validates whether an answer is within the valid 1-5 integer Likert scale.
 */
export function isValidResponse(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Score a single dimension given raw answer map.
 * Strict Rule: Must have valid responses for ALL 3 questions.
 * If any answer is missing, undefined, null, or skipped, returns "Insufficient responses".
 */
export function scoreDimension(
  dimensionKey: AssessmentDimensionKey,
  answers: Record<string, number | null | undefined>
): DimensionScoreResult {
  const meta = ASSESSMENT_DIMENSIONS.find((d) => d.key === dimensionKey);
  const questions = ASSESSMENT_QUESTIONS.filter((q) => q.dimensionKey === dimensionKey);

  const questionIds = questions.map((q) => q.id);
  const validAnswers: number[] = [];

  for (const q of questions) {
    const val = answers[q.id];
    if (isValidResponse(val)) {
      validAnswers.push(val);
    }
  }

  const validAnswerCount = validAnswers.length;
  const totalQuestions = questions.length; // strictly 3

  // Requirement: Score can ONLY be calculated when all 3 questions have valid responses
  if (validAnswerCount < totalQuestions) {
    return {
      dimensionKey,
      title: meta?.title || dimensionKey,
      shortDescription: meta?.shortDescription || "",
      discussionSuggestion: meta?.discussionSuggestion || "",
      status: "insufficient",
      mean: null,
      formattedMean: "Insufficient responses",
      band: null,
      validAnswerCount,
      totalQuestions,
      questionIds,
    };
  }

  // Calculate arithmetic mean
  const sum = validAnswers.reduce((acc, curr) => acc + curr, 0);
  const mean = Math.round((sum / totalQuestions) * 100) / 100;
  const band = getInterpretationBand(mean);

  return {
    dimensionKey,
    title: meta?.title || dimensionKey,
    shortDescription: meta?.shortDescription || "",
    discussionSuggestion: meta?.discussionSuggestion || "",
    status: "scored",
    mean,
    formattedMean: mean.toFixed(2),
    band,
    validAnswerCount,
    totalQuestions,
    questionIds,
  };
}

/**
 * Score the entire assessment across all 6 dimensions.
 * Computes individual dimension scores.
 * Note: INTENTIONALLY DOES NOT COMPUTE ANY OVERALL SCORE OR COMPOSITE RATING.
 */
export function scoreAssessment(
  answers: Record<string, number | null | undefined>,
  reflections: ReflectionAnswers = {}
): AssessmentReportResult {
  const dimensions = ASSESSMENT_DIMENSIONS.map((dim) =>
    scoreDimension(dim.key, answers)
  );

  let answeredCount = 0;
  let skippedCount = 0;

  for (const q of ASSESSMENT_QUESTIONS) {
    const val = answers[q.id];
    if (isValidResponse(val)) {
      answeredCount++;
    } else {
      skippedCount++;
    }
  }

  const allComplete = dimensions.every((d) => d.status === "scored");

  return {
    completionStatus: allComplete ? "completed" : "partial",
    completedAt: new Date().toISOString(),
    dimensions,
    answeredQuestionsCount: answeredCount,
    skippedQuestionsCount: skippedCount,
    totalQuestionsCount: ASSESSMENT_QUESTIONS.length,
    reflections,
    disclaimer: ASSESSMENT_DISCLAIMER,
    isSessionOnly: true,
  };
}
