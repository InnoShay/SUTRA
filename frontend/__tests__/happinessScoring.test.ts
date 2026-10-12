/**
 * Unit Test Suite for SUTRA Happiness Index Calculations & Privacy Rules
 *
 * Verifies:
 * 1. 1-5 Likert scale validation and rejection of out-of-bounds/non-integer values.
 * 2. Positively worded normalization: ((response - 1) / 4) * 100.
 * 3. Dimension mean calculation excluding missing values.
 * 4. Missing answers are NEVER treated as neutral (50) or zero (0).
 * 5. Institutional Happiness Index equal-weighted calculation across valid dimensions.
 * 6. Minimum sample threshold (N >= 10) privacy guard.
 * 7. Non-clinical interpretation band boundary values.
 * 8. Absolute point change calculation.
 */

import assert from "node:assert";
import {
  isValidResponse,
  normalizeResponse,
  computeDimensionScore,
  computeHappinessIndex,
  isGroupPrivacyProtected,
  getHappinessInterpretationBand,
  computeAbsolutePointChange,
} from "../lib/happinessScoring";
import {
  HAPPINESS_MIN_SAMPLE_THRESHOLD,
  HAPPINESS_INTERPRETATION_BANDS,
  HAPPINESS_QUESTIONS,
  HAPPINESS_DIMENSIONS,
} from "../lib/happinessData";

console.log("=== SUTRA Happiness Index Calculation & Privacy Test Suite ===\n");

// --- TEST 1: Likert Response Scale Validation ---
console.log("1. Validating 1-5 Likert scale responses...");
assert.strictEqual(isValidResponse(1), true);
assert.strictEqual(isValidResponse(2), true);
assert.strictEqual(isValidResponse(3), true);
assert.strictEqual(isValidResponse(4), true);
assert.strictEqual(isValidResponse(5), true);
assert.strictEqual(isValidResponse(0), false, "0 must be rejected");
assert.strictEqual(isValidResponse(6), false, "6 must be rejected");
assert.strictEqual(isValidResponse(-1), false, "Negative values must be rejected");
assert.strictEqual(isValidResponse(3.5), false, "Decimals must be rejected");
assert.strictEqual(isValidResponse(null), false, "null must be rejected");
assert.strictEqual(isValidResponse(undefined), false, "undefined must be rejected");
assert.strictEqual(isValidResponse("4"), false, "strings must be rejected");
console.log("   ✓ Likert scale input validation confirmed.\n");

// --- TEST 2: Individual Response Normalization Formula ---
console.log("2. Validating response normalization formula ((r-1)/4)*100...");
assert.strictEqual(normalizeResponse(1), 0, "Response 1 must normalize to 0");
assert.strictEqual(normalizeResponse(2), 25, "Response 2 must normalize to 25");
assert.strictEqual(normalizeResponse(3), 50, "Response 3 must normalize to 50");
assert.strictEqual(normalizeResponse(4), 75, "Response 4 must normalize to 75");
assert.strictEqual(normalizeResponse(5), 100, "Response 5 must normalize to 100");
assert.throws(() => normalizeResponse(0), /Invalid Likert response/);
assert.throws(() => normalizeResponse(6), /Invalid Likert response/);
console.log("   ✓ Response normalization accurately produces 0, 25, 50, 75, 100.\n");

// --- TEST 3: Dimension Mean & Missing Value Exclusion ---
console.log("3. Validating dimension score mean and missing-value exclusion...");
// 3 valid responses on 1-5 scale: 4 (75), 5 (100), 3 (50) -> mean = (75+100+50)/3 = 75.0
const sampleDim = computeDimensionScore([4, 5, 3]);
assert.strictEqual(sampleDim, 75.0);

// Missing values (null, undefined) must be excluded from denominator
// Responses: 5 (100), null, undefined, 3 (50) -> valid count = 2, sum = 150 -> mean = 75.0
const missingDim = computeDimensionScore([5, null, undefined, 3]);
assert.strictEqual(missingDim, 75.0, "Missing values must be excluded, not treated as 0 or 50");

// Empty responses list produces null (not 0 or NaN)
assert.strictEqual(computeDimensionScore([]), null);
assert.strictEqual(computeDimensionScore([null, undefined]), null);
console.log("   ✓ Dimension score excludes missing values and prevents zero/neutral fabrication.\n");

// --- TEST 4: Institutional Happiness Index Equal Weighting ---
console.log("4. Validating institutional index calculation (equal weighting across 6 dimensions)...");
// 6 valid dimension scores: [80, 70, 60, 90, 75, 85] -> sum = 460 / 6 = 76.7
const institutionalScore = computeHappinessIndex([80, 70, 60, 90, 75, 85]);
assert.strictEqual(institutionalScore, 76.7);

// Partial dimensions: missing dimensions excluded from denominator
// 4 valid scores: [80, 70, null, 90, 60, undefined] -> sum = 300 / 4 = 75.0
const partialIndex = computeHappinessIndex([80, 70, null, 90, 60, undefined]);
assert.strictEqual(partialIndex, 75.0);

// All missing dimensions returns null
assert.strictEqual(computeHappinessIndex([null, null, undefined]), null);
console.log("   ✓ Equal-weighted institutional aggregation confirmed.\n");

// --- TEST 5: Privacy Protection Threshold (N >= 10) ---
console.log("5. Validating group privacy threshold (N >= 10)...");
assert.strictEqual(HAPPINESS_MIN_SAMPLE_THRESHOLD, 10);
assert.strictEqual(isGroupPrivacyProtected(10), true);
assert.strictEqual(isGroupPrivacyProtected(15), true);
assert.strictEqual(isGroupPrivacyProtected(9), false, "Cohort under 10 must be suppressed");
assert.strictEqual(isGroupPrivacyProtected(0), false);
assert.strictEqual(isGroupPrivacyProtected(-1), false);
console.log("   ✓ Group privacy protection prevents disclosure for sample sizes < 10.\n");

// --- TEST 6: Interpretation Band Boundaries ---
console.log("6. Validating interpretation band boundaries...");
// 80-100: Strong
assert.strictEqual(getHappinessInterpretationBand(100)?.key, "strong");
assert.strictEqual(getHappinessInterpretationBand(80)?.key, "strong");
assert.strictEqual(getHappinessInterpretationBand(80)?.label, "Strong");

// 65-79.99: Positive
assert.strictEqual(getHappinessInterpretationBand(79.9)?.key, "positive");
assert.strictEqual(getHappinessInterpretationBand(65)?.key, "positive");
assert.strictEqual(getHappinessInterpretationBand(65)?.label, "Positive");

// 50-64.99: Needs Attention
assert.strictEqual(getHappinessInterpretationBand(64.9)?.key, "needs_attention");
assert.strictEqual(getHappinessInterpretationBand(50)?.key, "needs_attention");
assert.strictEqual(getHappinessInterpretationBand(50)?.label, "Needs Attention");

// 0-49.99: Priority for Review
assert.strictEqual(getHappinessInterpretationBand(49.9)?.key, "priority_review");
assert.strictEqual(getHappinessInterpretationBand(0)?.key, "priority_review");
assert.strictEqual(getHappinessInterpretationBand(0)?.label, "Priority for Review");

// Null or out of bounds returns null
assert.strictEqual(getHappinessInterpretationBand(null), null);
assert.strictEqual(getHappinessInterpretationBand(-5), null);
assert.strictEqual(getHappinessInterpretationBand(105), null);
console.log("   ✓ Interpretation bands accurately reflect provisional non-clinical definitions.\n");

// --- TEST 7: Absolute Point Change ---
console.log("7. Validating absolute point change calculation...");
assert.strictEqual(computeAbsolutePointChange(76.5, 73.2), 3.3);
assert.strictEqual(computeAbsolutePointChange(70.0, 75.2), -5.2);
assert.strictEqual(computeAbsolutePointChange(null, 70.0), null);
assert.strictEqual(computeAbsolutePointChange(70.0, null), null);
console.log("   ✓ Absolute point change arithmetic verified.\n");

// --- TEST 8: Dimension & Question Consistency ---
console.log("8. Validating dimension and question structural consistency...");
assert.strictEqual(HAPPINESS_DIMENSIONS.length, 6, "Must define exactly 6 dimensions");
assert.strictEqual(HAPPINESS_QUESTIONS.length, 6, "Must define exactly 6 weekly questions");

const dimensionKeys = new Set(HAPPINESS_DIMENSIONS.map((d) => d.key));
for (const q of HAPPINESS_QUESTIONS) {
  assert(
    dimensionKeys.has(q.dimensionKey),
    `Question ${q.id} references undefined dimension ${q.dimensionKey}`
  );
  assert(q.prompt && q.prompt.length > 10, `Question ${q.id} has invalid prompt`);
}
console.log("   ✓ 6 dimensions map 1:1 with 6 weekly questions.\n");

console.log("==================================================");
console.log("ALL HAPPINESS INDEX SCORING TESTS PASSED ✓");
console.log("==================================================");
