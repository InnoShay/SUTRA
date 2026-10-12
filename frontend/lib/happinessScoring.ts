/**
 * SUTRA Happiness Index - Pure Calculation & Privacy Engine
 *
 * Implements the mathematical formulas and data quality safeguards defined in
 * Section 6 of the SUTRA Master Implementation Specification:
 *
 * 1. Individual response normalization: ((response - 1) / 4) * 100
 * 2. Dimension score: mean of valid responses (missing excluded; never zero or neutral)
 * 3. Institutional index: mean of valid dimension scores (equal weighting)
 * 4. Privacy protection: minimum 10 respondent threshold
 * 5. Non-clinical interpretation banding
 */

import {
  HAPPINESS_MIN_SAMPLE_THRESHOLD,
  HAPPINESS_INTERPRETATION_BANDS,
  HappinessInterpretationBand,
} from "./happinessData";

/**
 * Validates that a Likert response value is an integer strictly between 1 and 5.
 */
export function isValidResponse(value: unknown): value is number {
  if (typeof value !== "number" || isNaN(value)) {
    return false;
  }
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Normalizes a 1–5 Likert response to a 0–100 scale:
 * 1 -> 0, 2 -> 25, 3 -> 50, 4 -> 75, 5 -> 100
 *
 * Throws an Error if value is outside the 1–5 range.
 */
export function normalizeResponse(response: number): number {
  if (!isValidResponse(response)) {
    throw new Error(
      `Invalid Likert response: ${response}. Expected integer in range [1, 5].`
    );
  }
  return ((response - 1) / 4) * 100;
}

/**
 * Computes the arithmetic mean of normalized scores for a dimension.
 * Excludes missing/invalid scores (never assumes 0 or 50).
 * Returns null if there are no valid responses.
 */
export function computeDimensionScore(
  responses: (number | null | undefined)[]
): number | null {
  const validNormalized = responses
    .filter((r): r is number => r !== null && r !== undefined && !isNaN(r))
    .map((r) => {
      // If response is on 1-5 scale, normalize it; if already normalized (0-100), pass through
      if (isValidResponse(r)) {
        return normalizeResponse(r);
      }
      if (r >= 0 && r <= 100) {
        return r;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  if (validNormalized.length === 0) {
    return null;
  }

  const sum = validNormalized.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / validNormalized.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Computes the Institutional Happiness Index as the equal-weighted mean
 * of valid dimension scores. Missing dimensions are excluded from the denominator.
 * Returns null if no valid dimensions exist.
 */
export function computeHappinessIndex(
  dimensionScores: (number | null | undefined)[]
): number | null {
  const validScores = dimensionScores.filter(
    (s): s is number => s !== null && s !== undefined && !isNaN(s) && s >= 0 && s <= 100
  );

  if (validScores.length === 0) {
    return null;
  }

  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / validScores.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Privacy guard: verifies if a group has met the minimum sample size threshold
 * (default N = 10) to display aggregate analytics without risking student re-identification.
 */
export function isGroupPrivacyProtected(
  responseCount: number,
  threshold: number = HAPPINESS_MIN_SAMPLE_THRESHOLD
): boolean {
  return typeof responseCount === "number" && responseCount >= threshold;
}

/**
 * Maps a 0–100 score to its provisional product-design interpretation band.
 * Returns null if score is null or out of bounds.
 */
export function getHappinessInterpretationBand(
  score: number | null | undefined
): HappinessInterpretationBand | null {
  if (score === null || score === undefined || isNaN(score) || score < 0 || score > 100) {
    return null;
  }

  const band = HAPPINESS_INTERPRETATION_BANDS.find(
    (b) => score >= b.min && score <= b.max
  );
  return band || HAPPINESS_INTERPRETATION_BANDS[HAPPINESS_INTERPRETATION_BANDS.length - 1];
}

/**
 * Calculates absolute point change between current and previous period.
 * Avoids misleading percentages when baseline is zero or small.
 */
export function computeAbsolutePointChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    isNaN(current) ||
    isNaN(previous)
  ) {
    return null;
  }
  return Math.round((current - previous) * 10) / 10;
}
