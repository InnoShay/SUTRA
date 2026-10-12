/**
 * Unit Test Suite for SUTRA Student Guidance Assessment Scoring Logic
 *
 * Verifies:
 * 1. Correct arithmetic dimension means.
 * 2. Strict coverage requirement: all 3 questions required for a dimension.
 * 3. Skipped questions never treated as zero.
 * 4. Exact interpretation-band boundary values.
 * 5. Rejection of invalid response values.
 * 6. Optional reflection questions excluded from scoring.
 * 7. Verification that NO overall composite or risk score is calculated.
 */

import assert from "node:assert";
import {
  scoreDimension,
  scoreAssessment,
  getInterpretationBand,
  isValidResponse,
} from "../components/assessment/assessmentScoring";
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_DIMENSIONS,
} from "../components/assessment/assessmentData";

console.log("=== SUTRA Assessment Scoring Logic Test Suite ===\n");

// --- TEST 1: Validity Check for Response Scale ---
console.log("1. Validating 1-5 Likert scale values...");
assert.strictEqual(isValidResponse(1), true);
assert.strictEqual(isValidResponse(3), true);
assert.strictEqual(isValidResponse(5), true);
assert.strictEqual(isValidResponse(0), false, "0 must be rejected");
assert.strictEqual(isValidResponse(6), false, "6 must be rejected");
assert.strictEqual(isValidResponse(-1), false, "Negative values must be rejected");
assert.strictEqual(isValidResponse(3.5), false, "Non-integers must be rejected");
assert.strictEqual(isValidResponse(null), false, "Null must be rejected");
assert.strictEqual(isValidResponse(undefined), false, "Undefined must be rejected");
assert.strictEqual(isValidResponse("4"), false, "Strings must be rejected");
console.log("   ✓ Likert scale input validation confirmed.\n");

// --- TEST 2: Interpretation Band Boundaries ---
console.log("2. Validating interpretation band boundary values...");
// Band: Explore support (1.00 - 2.49)
assert.strictEqual(getInterpretationBand(1.00).key, "explore_support");
assert.strictEqual(getInterpretationBand(2.00).key, "explore_support");
assert.strictEqual(getInterpretationBand(2.49).key, "explore_support");
assert.strictEqual(getInterpretationBand(2.49).label, "Explore support");

// Band: Mixed / developing (2.50 - 3.49)
assert.strictEqual(getInterpretationBand(2.50).key, "mixed_developing");
assert.strictEqual(getInterpretationBand(3.00).key, "mixed_developing");
assert.strictEqual(getInterpretationBand(3.49).key, "mixed_developing");
assert.strictEqual(getInterpretationBand(3.49).label, "Mixed / developing");

// Band: Current resource (3.50 - 5.00)
assert.strictEqual(getInterpretationBand(3.50).key, "current_resource");
assert.strictEqual(getInterpretationBand(4.00).key, "current_resource");
assert.strictEqual(getInterpretationBand(5.00).key, "current_resource");
assert.strictEqual(getInterpretationBand(5.00).label, "Current resource");
console.log("   ✓ All boundary values mapped correctly to approved bands.\n");

// --- TEST 3: Correct Arithmetic Dimension Means (3 Valid Answers) ---
console.log("3. Validating dimension arithmetic means for complete responses...");
// Dimension 1: learning_approach has q1, q2, q3
const completeAnswersLow = { q1: 1, q2: 2, q3: 1 };
const resultLow = scoreDimension("learning_approach", completeAnswersLow);
assert.strictEqual(resultLow.status, "scored");
assert.strictEqual(resultLow.validAnswerCount, 3);
assert.strictEqual(resultLow.mean, 1.33); // (1 + 2 + 1) / 3 = 1.3333... rounded to 1.33
assert.strictEqual(resultLow.formattedMean, "1.33");
assert.strictEqual(resultLow.band?.key, "explore_support");

const completeAnswersMid = { q1: 3, q2: 3, q3: 3 };
const resultMid = scoreDimension("learning_approach", completeAnswersMid);
assert.strictEqual(resultMid.status, "scored");
assert.strictEqual(resultMid.mean, 3.00);
assert.strictEqual(resultMid.formattedMean, "3.00");
assert.strictEqual(resultMid.band?.key, "mixed_developing");

const completeAnswersHigh = { q1: 5, q2: 4, q3: 4 };
const resultHigh = scoreDimension("learning_approach", completeAnswersHigh);
assert.strictEqual(resultHigh.status, "scored");
assert.strictEqual(resultHigh.mean, 4.33); // (5 + 4 + 4) / 3 = 4.3333... rounded to 4.33
assert.strictEqual(resultHigh.formattedMean, "4.33");
assert.strictEqual(resultHigh.band?.key, "current_resource");
console.log("   ✓ Complete 3-item arithmetic means calculated accurately.\n");

// --- TEST 4: Coverage Requirement (All 3 Required) & Skipped Questions ---
console.log("4. Validating strict all-3-required coverage rule...");
// 2 of 3 answered, 1 skipped
const twoOfThreeAnswers = { q1: 4, q2: 5, q3: null };
const resultPartial = scoreDimension("learning_approach", twoOfThreeAnswers);
assert.strictEqual(
  resultPartial.status,
  "insufficient",
  "Must yield 'insufficient' status when 1 question is skipped"
);
assert.strictEqual(resultPartial.mean, null, "Mean must be null when insufficient");
assert.strictEqual(
  resultPartial.formattedMean,
  "Insufficient responses",
  "Must display 'Insufficient responses'"
);
assert.strictEqual(resultPartial.band, null, "Band must be null when insufficient");
assert.strictEqual(resultPartial.validAnswerCount, 2);

// 1 of 3 answered, 2 skipped
const oneOfThreeAnswers = { q1: 4, q2: undefined, q3: null };
const resultOne = scoreDimension("learning_approach", oneOfThreeAnswers);
assert.strictEqual(resultOne.status, "insufficient");
assert.strictEqual(resultOne.mean, null);
assert.strictEqual(resultOne.formattedMean, "Insufficient responses");

// 0 of 3 answered
const zeroAnswers = {};
const resultZero = scoreDimension("learning_approach", zeroAnswers);
assert.strictEqual(resultZero.status, "insufficient");
assert.strictEqual(resultZero.mean, null);
assert.strictEqual(resultZero.formattedMean, "Insufficient responses");
console.log("   ✓ Strict all-3-required rule enforced: partial dimensions yield 'Insufficient responses'.\n");

// --- TEST 5: Skipped Answers Never Treated as Zero ---
console.log("5. Verifying skipped answers are never treated as zero...");
// If q3 was treated as zero, (5 + 5 + 0) / 3 = 3.33 instead of insufficient
const skippedAnswerCheck = { q1: 5, q2: 5, q3: null };
const skippedResult = scoreDimension("learning_approach", skippedAnswerCheck);
assert.strictEqual(skippedResult.mean, null);
assert.notStrictEqual(skippedResult.mean, 3.33);
assert.notStrictEqual(skippedResult.mean, 0);
console.log("   ✓ Confirmed: skipped answers are never converted into zero or factored into math.\n");

// --- TEST 6: Full Assessment Scoring & No Composite Risk Score ---
console.log("6. Validating full assessment scoring across all 6 dimensions...");
const allAnswers: Record<string, number> = {};
for (let i = 1; i <= 18; i++) {
  allAnswers[`q${i}`] = 4;
}

const fullResult = scoreAssessment(allAnswers, {
  q19Challenge: "Time management",
  q20SessionGoal: "A practical study plan",
});

assert.strictEqual(fullResult.dimensions.length, 6, "Must contain exactly 6 dimensions");
assert.strictEqual(fullResult.answeredQuestionsCount, 18);
assert.strictEqual(fullResult.skippedQuestionsCount, 0);
assert.strictEqual(fullResult.totalQuestionsCount, 18);
assert.strictEqual(fullResult.completionStatus, "completed");

// Verify every dimension is scored
for (const dim of fullResult.dimensions) {
  assert.strictEqual(dim.status, "scored");
  assert.strictEqual(dim.mean, 4.00);
  assert.strictEqual(dim.band?.key, "current_resource");
  assert(dim.discussionSuggestion.length > 0);
}

// CRITICAL TEST: Guarantee NO composite overall score, risk score, or ranking exists
const resultKeys = Object.keys(fullResult);
assert.strictEqual(resultKeys.includes("overallScore"), false, "No overallScore permitted");
assert.strictEqual(resultKeys.includes("totalScore"), false, "No totalScore permitted");
assert.strictEqual(resultKeys.includes("riskScore"), false, "No riskScore permitted");
assert.strictEqual(resultKeys.includes("riskTier"), false, "No riskTier permitted");
assert.strictEqual(resultKeys.includes("rank"), false, "No ranking permitted");
assert.strictEqual(resultKeys.includes("diagnosis"), false, "No clinical diagnosis permitted");
console.log("   ✓ Confirmed: Assessment produces NO composite score, risk score, rank, or diagnosis.\n");

// --- TEST 7: Optional Reflection Questions Excluded from Scoring ---
console.log("7. Validating optional reflection questions exclusion...");
assert.strictEqual(fullResult.reflections.q19Challenge, "Time management");
assert.strictEqual(fullResult.reflections.q20SessionGoal, "A practical study plan");

// Reflection questions must NOT be in any dimension question list
const allDimensionQuestionIds = fullResult.dimensions.flatMap((d) => d.questionIds);
assert.strictEqual(allDimensionQuestionIds.includes("q19"), false, "q19 must not be scored");
assert.strictEqual(allDimensionQuestionIds.includes("q20"), false, "q20 must not be scored");
console.log("   ✓ Confirmed: Optional reflection responses are strictly unscored.\n");

console.log("=== All 7 Assessment Scoring Test Suites Passed Successfully! ===\n");
